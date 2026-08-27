package expo.modules.callaudio

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
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
    private val onChunkReady: (base64Pcm: String, rms: Double, durationSec: Double, sampleCount: Long) -> Unit,
    private val onLevelUpdate: (rms: Double, db: Double) -> Unit,
    private val onError: (code: String, message: String) -> Unit
) {
    private val isRecording = AtomicBoolean(false)
    private var captureThread: Thread? = null
    private var audioRecord: AudioRecord? = null

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
            // Try VOICE_COMMUNICATION first for AEC and telephony tuning, fallback to MIC
            var record: AudioRecord? = null
            try {
                record = AudioRecord(
                    MediaRecorder.AudioSource.VOICE_COMMUNICATION,
                    sampleRate,
                    AudioFormat.CHANNEL_IN_MONO,
                    AudioFormat.ENCODING_PCM_16BIT,
                    internalBufferSize
                )
            } catch (_: Exception) {}

            if (record == null || record.state != AudioRecord.STATE_INITIALIZED) {
                record?.release()
                record = AudioRecord(
                    MediaRecorder.AudioSource.MIC,
                    sampleRate,
                    AudioFormat.CHANNEL_IN_MONO,
                    AudioFormat.ENCODING_PCM_16BIT,
                    internalBufferSize
                )
            }

            if (record.state != AudioRecord.STATE_INITIALIZED) {
                record.release()
                onError("AUDIO_INIT_FAILED", "AudioRecord initialization failed.")
                return false
            }

            audioRecord = record
            ringBuffer.clear()
            totalSamplesCaptured = 0
            startTimeMillis = System.currentTimeMillis()
            isRecording.set(true)

            record.startRecording()

            captureThread = Thread({
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

        while (isRecording.get()) {
            val record = audioRecord ?: break
            val readBytes = record.read(tempBuffer, 0, tempBuffer.size)

            if (readBytes > 0) {
                ringBuffer.write(tempBuffer, 0, readBytes)
                totalSamplesCaptured += (readBytes / 2)

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

        captureThread?.interrupt()
        captureThread = null
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
