package expo.modules.callaudio

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioRecord
import android.media.MediaRecorder
import android.media.audiofx.AcousticEchoCanceler
import android.media.audiofx.AutomaticGainControl
import android.media.audiofx.NoiseSuppressor
import android.util.Base64
import androidx.core.content.ContextCompat
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Background audio capture pipeline for capturing PCM 16-bit mono audio
 * into a rolling 5-second ring buffer.
 */
class AudioCaptureEngine(
    private val context: Context,
    private val sampleRate: Int = 16000,
    private val windowDurationSec: Int = 5,
    private val intervalSec: Double = 2.5,
    private val saveFilePath: String? = null,
    private val autoSpeaker: Boolean = false,
    private val onChunkReady: (base64Pcm: String, rms: Double, durationSec: Double, sampleCount: Long) -> Unit,
    private val onLevelUpdate: (rms: Double, db: Double) -> Unit,
    private val onError: (code: String, message: String) -> Unit
) {
    private val isRecording = AtomicBoolean(false)
    private var captureThread: Thread? = null
    private var audioRecord: AudioRecord? = null
    private var saveFile: java.io.RandomAccessFile? = null
    private val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
    private var originalSpeakerState = false

    // 5 seconds rolling buffer size in bytes (16kHz * 2 bytes/sample * 5 sec = 160,000 bytes)
    private val bufferCapacityBytes = sampleRate * 2 * windowDurationSec
    private val ringBuffer = RingBuffer(bufferCapacityBytes)

    private var startTimeMillis: Long = 0
    private var totalSamplesCaptured: Long = 0

    @SuppressLint("MissingPermission")
    fun start(): Boolean {
        if (isRecording.get()) return true

        if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            onError("PERMISSION_DENIED", "RECORD_AUDIO permission is not granted.")
            return false
        }

        val minBufSize = AudioRecord.getMinBufferSize(
            sampleRate,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT
        )

        if (minBufSize <= 0) {
            onError("UNSUPPORTED_AUDIO_FORMAT", "Failed to compute valid buffer size for $sampleRate Hz mono PCM.")
            return false
        }

        val internalBufferSize = Math.max(minBufSize * 2, 4096)

        try {
            // - VOICE_RECOGNITION (6) MUST be first because it is the ONLY source that 
            //   bypasses the concurrent capture restriction (zero-byte buffers) on Android 10+ 
            //   when the Accessibility Service is active.
            // - We will disable AEC/NS/AGC on it further down so it captures the speakerphone.
            val sourcesToTry = if (autoSpeaker) {
                listOf(
                    MediaRecorder.AudioSource.VOICE_RECOGNITION,
                    MediaRecorder.AudioSource.MIC,
                    MediaRecorder.AudioSource.VOICE_COMMUNICATION
                )
            } else {
                listOf(
                    4, // VOICE_CALL — both sides (system permission required)
                    MediaRecorder.AudioSource.VOICE_RECOGNITION,
                    MediaRecorder.AudioSource.VOICE_COMMUNICATION,
                    MediaRecorder.AudioSource.MIC
                )
            }

            var record: AudioRecord? = null
            var usedSource = -1

            for (source in sourcesToTry) {
                try {
                    val candidate = AudioRecord(
                        source,
                        sampleRate,
                        AudioFormat.CHANNEL_IN_MONO,
                        AudioFormat.ENCODING_PCM_16BIT,
                        internalBufferSize
                    )
                    if (candidate.state == AudioRecord.STATE_INITIALIZED) {
                        record = candidate
                        usedSource = source
                        android.util.Log.i("VoiceGuardCapture", "AudioRecord initialized with source=$source")
                        break
                    } else {
                        candidate.release()
                        android.util.Log.w("VoiceGuardCapture", "AudioRecord source=$source failed init, trying next")
                    }
                } catch (e: Exception) {
                    android.util.Log.w("VoiceGuardCapture", "AudioRecord source=$source threw: ${e.message}, trying next")
                }
            }

            if (record == null) {
                onError("AUDIO_INIT_FAILED", "All AudioRecord sources failed to initialize.")
                return false
            }

            // When using the speakerphone trick, disable ALL hardware audio processing
            // effects that would otherwise cancel the caller's voice from the recording.
            if (autoSpeaker) {
                val audioSessionId = record.audioSessionId
                try {
                    if (AcousticEchoCanceler.isAvailable()) {
                        AcousticEchoCanceler.create(audioSessionId)?.enabled = false
                        android.util.Log.i("VoiceGuardCapture", "AcousticEchoCanceler disabled")
                    }
                    if (NoiseSuppressor.isAvailable()) {
                        NoiseSuppressor.create(audioSessionId)?.enabled = false
                        android.util.Log.i("VoiceGuardCapture", "NoiseSuppressor disabled")
                    }
                    if (AutomaticGainControl.isAvailable()) {
                        AutomaticGainControl.create(audioSessionId)?.enabled = false
                        android.util.Log.i("VoiceGuardCapture", "AutomaticGainControl disabled")
                    }
                } catch (e: Exception) {
                    android.util.Log.w("VoiceGuardCapture", "Could not disable audio effects: ${e.message}")
                }
            }

            if (saveFilePath != null) {
                try {
                    saveFile = java.io.RandomAccessFile(saveFilePath, "rw")
                    saveFile?.setLength(0) // clear file if it exists
                    saveFile?.write(ByteArray(44)) // placeholder for WAV header
                } catch (e: Exception) {
                    onError("FILE_OPEN_ERROR", "Could not open file for saving audio: ${e.localizedMessage}")
                }
            }

            audioRecord = record
            ringBuffer.clear()
            totalSamplesCaptured = 0
            startTimeMillis = System.currentTimeMillis()
            isRecording.set(true)

            if (autoSpeaker && audioManager != null) {
                originalSpeakerState = audioManager.isSpeakerphoneOn
            }

            record.startRecording()

            captureThread = Thread({
                if (autoSpeaker && audioManager != null && !originalSpeakerState) {
                    try {
                        Thread.sleep(500) // Wait for dialer to finish its routing setup
                        audioManager.isSpeakerphoneOn = true
                        android.util.Log.i("VoiceGuardCapture", "Forced speakerphone ON (delayed)")
                        
                        // Some devices require doing it twice or setting mode
                        Thread.sleep(500)
                        if (!audioManager.isSpeakerphoneOn) {
                            audioManager.isSpeakerphoneOn = true
                            android.util.Log.i("VoiceGuardCapture", "Forced speakerphone ON again")
                        }
                    } catch (e: Exception) {}
                }
                
                runCaptureLoop(internalBufferSize)
            }, "VoiceGuardAudioCaptureThread").apply {
                priority = Thread.MAX_PRIORITY
                start()
            }

            return true
        } catch (e: Exception) {
            onError("AUDIO_START_EXCEPTION", e.localizedMessage ?: "Unknown audio recording exception")
            stop()
            return false
        }
    }

    private fun runCaptureLoop(readChunkSize: Int) {
        val tempBuffer = ByteArray(readChunkSize)
        var lastDispatchTime = System.currentTimeMillis()
        val dispatchIntervalMillis = (intervalSec * 1000).toLong()
        var silentChunkCount = 0
        var totalChunkCount = 0

        while (isRecording.get()) {
            val record = audioRecord ?: break
            val readBytes = record.read(tempBuffer, 0, tempBuffer.size)

            if (readBytes > 0) {
                try {
                    saveFile?.write(tempBuffer, 0, readBytes)
                } catch (e: Exception) {}

                ringBuffer.write(tempBuffer, 0, readBytes)
                totalSamplesCaptured += (readBytes / 2)

                // Detect silence: check if all samples are near zero
                totalChunkCount++
                var maxAmplitude = 0
                var i = 0
                while (i < readBytes - 1) {
                    val sample = (tempBuffer[i + 1].toInt() shl 8) or (tempBuffer[i].toInt() and 0xFF)
                    if (Math.abs(sample) > maxAmplitude) maxAmplitude = Math.abs(sample)
                    i += 2
                }
                if (maxAmplitude < 50) silentChunkCount++
                if (totalChunkCount % 20 == 0) {
                    android.util.Log.i("VoiceGuardCapture", "Chunks: $totalChunkCount, silent: $silentChunkCount, lastMaxAmp: $maxAmplitude, bytesWritten: ${totalSamplesCaptured * 2}")
                }

                // Calculate RMS for instantaneous feedback
                val currentRms = ringBuffer.calculateLatestRms(Math.min(readBytes, 2048))
                val db = if (currentRms > 0.0) 20 * Math.log10(currentRms) else -90.0
                onLevelUpdate(currentRms, db)

                val now = System.currentTimeMillis()
                // Dispatch rolling window periodically if we have at least 1.5s of audio
                if (now - lastDispatchTime >= dispatchIntervalMillis) {
                    val availableBytes = Math.min(
                        ringBuffer.getTotalBytesWritten().toInt(),
                        bufferCapacityBytes
                    )

                    // Must have at least 1.5 seconds of data (sampleRate * 2 * 1.5)
                    val minBytesNeeded = (sampleRate * 2 * 1.5).toInt()
                    if (availableBytes >= minBytesNeeded) {
                        val windowBytes = ringBuffer.readLatest(bufferCapacityBytes)
                        val base64Data = Base64.encodeToString(windowBytes, Base64.NO_WRAP)
                        val windowRms = ringBuffer.calculateLatestRms(windowBytes.size)
                        val elapsedSec = (now - startTimeMillis) / 1000.0

                        onChunkReady(base64Data, windowRms, elapsedSec, totalSamplesCaptured)
                        lastDispatchTime = now
                    }
                }
            } else if (readBytes < 0) {
                // AudioRecord error
                if (isRecording.get()) {
                    onError("AUDIO_READ_ERROR", "AudioRecord read error code: $readBytes")
                }
                break
            }
        }
    }

    fun stop() {
        if (!isRecording.compareAndSet(true, false)) {
            return
        }

        try {
            audioRecord?.stop()
        } catch (_: Exception) {}

        try {
            audioRecord?.release()
        } catch (_: Exception) {}
        audioRecord = null

        if (autoSpeaker && audioManager != null) {
            try {
                if (audioManager.isSpeakerphoneOn != originalSpeakerState) {
                    audioManager.isSpeakerphoneOn = originalSpeakerState
                    android.util.Log.i("VoiceGuardCapture", "Restored speakerphone to $originalSpeakerState")
                }
            } catch (_: Exception) {}
        }

        try {
            saveFile?.let { sf ->
                val audioDataLength = sf.length() - 44
                if (audioDataLength > 0) {
                    writeWavHeader(sf, audioDataLength)
                }
                sf.close()
            }
        } catch (e: Exception) {}
        saveFile = null

        captureThread?.interrupt()
        captureThread = null
    }

    private fun writeWavHeader(out: java.io.RandomAccessFile, audioDataLength: Long) {
        val totalDataLen = audioDataLength + 36
        val byteRate = (sampleRate * 2).toLong()

        out.seek(0)
        
        val header = ByteArray(44)
        header[0] = 'R'.code.toByte() // RIFF/WAVE header
        header[1] = 'I'.code.toByte()
        header[2] = 'F'.code.toByte()
        header[3] = 'F'.code.toByte()
        header[4] = (totalDataLen and 0xff).toByte()
        header[5] = ((totalDataLen shr 8) and 0xff).toByte()
        header[6] = ((totalDataLen shr 16) and 0xff).toByte()
        header[7] = ((totalDataLen shr 24) and 0xff).toByte()
        header[8] = 'W'.code.toByte()
        header[9] = 'A'.code.toByte()
        header[10] = 'V'.code.toByte()
        header[11] = 'E'.code.toByte()
        header[12] = 'f'.code.toByte() // 'fmt ' chunk
        header[13] = 'm'.code.toByte()
        header[14] = 't'.code.toByte()
        header[15] = ' '.code.toByte()
        header[16] = 16 // 4 bytes: size of 'fmt ' chunk
        header[17] = 0
        header[18] = 0
        header[19] = 0
        header[20] = 1 // format = 1 (PCM)
        header[21] = 0
        header[22] = 1 // channels = 1
        header[23] = 0
        header[24] = (sampleRate.toLong() and 0xff).toByte()
        header[25] = ((sampleRate.toLong() shr 8) and 0xff).toByte()
        header[26] = ((sampleRate.toLong() shr 16) and 0xff).toByte()
        header[27] = ((sampleRate.toLong() shr 24) and 0xff).toByte()
        header[28] = (byteRate and 0xff).toByte()
        header[29] = ((byteRate shr 8) and 0xff).toByte()
        header[30] = ((byteRate shr 16) and 0xff).toByte()
        header[31] = ((byteRate shr 24) and 0xff).toByte()
        header[32] = (2).toByte() // block align
        header[33] = 0
        header[34] = 16 // bits per sample
        header[35] = 0
        header[36] = 'd'.code.toByte()
        header[37] = 'a'.code.toByte()
        header[38] = 't'.code.toByte()
        header[39] = 'a'.code.toByte()
        header[40] = (audioDataLength and 0xff).toByte()
        header[41] = ((audioDataLength shr 8) and 0xff).toByte()
        header[42] = ((audioDataLength shr 16) and 0xff).toByte()
        header[43] = ((audioDataLength shr 24) and 0xff).toByte()

        out.write(header, 0, 44)
    }

    fun getStatus(): Map<String, Any> {
        val elapsedSec = if (isRecording.get()) (System.currentTimeMillis() - startTimeMillis) / 1000.0 else 0.0
        val currentRms = if (isRecording.get()) ringBuffer.calculateLatestRms(2048) else 0.0
        return mapOf(
            "isRecording" to isRecording.get(),
            "sampleRate" to sampleRate,
            "windowDurationSec" to windowDurationSec,
            "totalSamplesCaptured" to totalSamplesCaptured,
            "elapsedDurationSec" to elapsedSec,
            "currentRms" to currentRms
        )
    }
}
