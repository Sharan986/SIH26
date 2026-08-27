package expo.modules.callaudio

import android.content.Context
import android.os.Build
import android.telephony.PhoneStateListener
import android.telephony.TelephonyCallback
import android.telephony.TelephonyManager

/**
 * Handles cellular call-state monitoring via TelephonyManager.
 * Supports Android 12+ (API 31) TelephonyCallback and legacy PhoneStateListener.
 */
class CallStateReceiver(
    private val context: Context,
    private val onCallStateChanged: (state: String) -> Unit
) {
    private val telephonyManager = context.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager
    private var currentState: String = "IDLE"

    // For Android 12+ (API 31+)
    private var telephonyCallback: TelephonyCallback? = null

    // For legacy Android (< API 31)
    private var legacyListener: PhoneStateListener? = null

    fun startListening() {
        if (telephonyManager == null) {
            currentState = "UNKNOWN"
            onCallStateChanged(currentState)
            return
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val callback = object : TelephonyCallback(), TelephonyCallback.CallStateListener {
                    override fun onCallStateChanged(state: Int) {
                        handleState(state)
                    }
                }
                telephonyCallback = callback
                telephonyManager.registerTelephonyCallback(context.mainExecutor, callback)
            } else {
                @Suppress("DEPRECATION")
                val listener = object : PhoneStateListener() {
                    @Deprecated("Deprecated in Java")
                    override fun onCallStateChanged(state: Int, phoneNumber: String?) {
                        handleState(state)
                    }
                }
                legacyListener = listener
                @Suppress("DEPRECATION")
                telephonyManager.listen(listener, PhoneStateListener.LISTEN_CALL_STATE)
            }
        } catch (_: Exception) {
            currentState = "UNKNOWN"
            onCallStateChanged(currentState)
        }
    }

    private fun handleState(state: Int) {
        val stateStr = when (state) {
            TelephonyManager.CALL_STATE_IDLE -> "IDLE"
            TelephonyManager.CALL_STATE_RINGING -> "RINGING"
            TelephonyManager.CALL_STATE_OFFHOOK -> "ACTIVE"
            else -> "UNKNOWN"
        }

        if (stateStr != currentState) {
            currentState = stateStr
            onCallStateChanged(stateStr)
        }
    }

    fun getCurrentState(): String {
        return currentState
    }

    fun stopListening() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                telephonyCallback?.let {
                    telephonyManager?.unregisterTelephonyCallback(it)
                }
                telephonyCallback = null
            } else {
                legacyListener?.let {
                    @Suppress("DEPRECATION")
                    telephonyManager?.listen(it, PhoneStateListener.LISTEN_NONE)
                }
                legacyListener = null
            }
        } catch (_: Exception) {}
    }
}
