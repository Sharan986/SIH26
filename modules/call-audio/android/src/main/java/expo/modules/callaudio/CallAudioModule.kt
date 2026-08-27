package expo.modules.callaudio

import android.content.Intent
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class CallAudioModule : Module() {
    private var audioCaptureEngine: AudioCaptureEngine? = null
    private var callStateReceiver: CallStateReceiver? = null

    override fun definition() = ModuleDefinition {
        Name("CallAudio")

        Events(
            "onCallStateChanged",
            "onAudioChunk",
            "onAudioLevel",
            "onError",
            "onCapabilityChecked"
        )

        OnCreate {
            val context = appContext.reactContext ?: return@OnCreate
            callStateReceiver = CallStateReceiver(context) { newState ->
                sendEvent("onCallStateChanged", mapOf("state" to newState))
            }
            callStateReceiver?.startListening()
        }

        OnDestroy {
            audioCaptureEngine?.stop()
            audioCaptureEngine = null
            callStateReceiver?.stopListening()
            callStateReceiver = null
        }

        Function("isAccessibilityEnabled") {
            val context = appContext.reactContext ?: return@Function false
            VoiceGuardAccessibilityService.isAccessibilitySettingsOn(context)
        }

        Function("openAccessibilitySettings") {
            val context = appContext.reactContext ?: return@Function false
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
            true
        }

        Function("getCallState") {
            callStateReceiver?.getCurrentState() ?: "UNKNOWN"
        }

        Function("checkAudioCapability") {
            val context = appContext.reactContext ?: return@Function mapOf(
                "supported" to false,
                "status" to "ERROR",
                "reason" to "Context unavailable"
            )
            val detector = AudioCapabilityDetector(context)
            val result = detector.checkCapability().toMap()
            sendEvent("onCapabilityChecked", result)
            result
        }

        Function("getDeviceCapabilities") {
            val context = appContext.reactContext ?: return@Function emptyMap<String, Any>()
            val detector = AudioCapabilityDetector(context)
            val cap = detector.checkCapability()
            val isAccEnabled = VoiceGuardAccessibilityService.isAccessibilitySettingsOn(context)

            mapOf(
                "androidVersion" to cap.androidVersion,
                "manufacturer" to cap.manufacturer,
                "model" to cap.model,
                "accessibilityEnabled" to isAccEnabled,
                "directCallAudio" to cap.directCallAudio,
                "microphone" to cap.localMicrophoneAvailable,
                "audioSource" to cap.audioSource,
                "status" to cap.status
            )
        }

        Function("startCallAudioCapture") { sampleRate: Int?, windowSec: Int?, saveLocal: Boolean?, autoSpeaker: Boolean? ->
            val context = appContext.reactContext ?: return@Function mapOf("started" to false, "savedPath" to null)
            val rate = sampleRate ?: 16000
            val winSec = windowSec ?: 5
            val shouldSave = saveLocal ?: false
            val useSpeaker = autoSpeaker ?: false
            
            var savePath: String? = null
            if (shouldSave) {
                val timestamp = System.currentTimeMillis()
                val cacheDir = context.cacheDir
                val file = java.io.File(cacheDir, "call_recording_$timestamp.wav")
                savePath = file.absolutePath
            }

            if (audioCaptureEngine != null) {
                audioCaptureEngine?.stop()
            }

            audioCaptureEngine = AudioCaptureEngine(
                context = context,
                sampleRate = rate,
                windowDurationSec = winSec,
                intervalSec = 2.5,
                saveFilePath = savePath,
                autoSpeaker = useSpeaker,
                onChunkReady = { base64Pcm, rms, durationSec, sampleCount ->
                    sendEvent("onAudioChunk", mapOf(
                        "audioBase64" to base64Pcm,
                        "rms" to rms,
                        "durationSec" to durationSec,
                        "sampleCount" to sampleCount,
                        "sampleRate" to rate
                    ))
                },
                onLevelUpdate = { rms, db ->
                    sendEvent("onAudioLevel", mapOf(
                        "rms" to rms,
                        "db" to db
                    ))
                },
                onError = { code, message ->
                    sendEvent("onError", mapOf(
                        "code" to code,
                        "message" to message
                    ))
                }
            )

            val started = audioCaptureEngine?.start() ?: false
            
            mapOf(
                "started" to started,
                "savedPath" to (if (started) savePath else null)
            )
        }

        Function("stopCallAudioCapture") {
            audioCaptureEngine?.stop()
            audioCaptureEngine = null
            true
        }

        Function("getAudioStatus") {
            audioCaptureEngine?.getStatus() ?: mapOf(
                "isRecording" to false,
                "sampleRate" to 16000,
                "windowDurationSec" to 5,
                "totalSamplesCaptured" to 0L,
                "elapsedDurationSec" to 0.0,
                "currentRms" to 0.0
            )
        }
    }
}
