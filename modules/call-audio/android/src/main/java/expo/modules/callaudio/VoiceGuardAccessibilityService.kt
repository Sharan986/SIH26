package expo.modules.callaudio

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Context
import android.provider.Settings
import android.text.TextUtils
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityManager

/**
 * Accessibility service for VoiceGuard.
 * Listens narrowly for in-call screen transitions (Dialer, Incall UI)
 * and assists in coordinating call detection.
 */
class VoiceGuardAccessibilityService : AccessibilityService() {

    companion object {
        var isServiceRunning = false
            private set

        private var instance: VoiceGuardAccessibilityService? = null

        fun isAccessibilitySettingsOn(context: Context): Boolean {
            if (isServiceRunning) {
                return true
            }

            try {
                val am = context.getSystemService(Context.ACCESSIBILITY_SERVICE) as? AccessibilityManager
                val enabledServices = am?.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK)
                if (enabledServices != null) {
                    for (info in enabledServices) {
                        val serviceInfo = info.resolveInfo?.serviceInfo
                        if (serviceInfo != null) {
                            if (serviceInfo.packageName == context.packageName &&
                                (serviceInfo.name == VoiceGuardAccessibilityService::class.java.name ||
                                 serviceInfo.name.contains("VoiceGuardAccessibilityService"))) {
                                return true
                            }
                        }
                    }
                }
            } catch (_: Exception) {}

            // Fallback via Settings.Secure
            var accessibilityEnabled = 0
            val service = "${context.packageName}/${VoiceGuardAccessibilityService::class.java.canonicalName}"
            val serviceShort = "${context.packageName}/${VoiceGuardAccessibilityService::class.java.simpleName}"
            try {
                accessibilityEnabled = Settings.Secure.getInt(
                    context.contentResolver,
                    Settings.Secure.ACCESSIBILITY_ENABLED
                )
            } catch (_: Settings.SettingNotFoundException) {}

            val stringColonSplitter = TextUtils.SimpleStringSplitter(':')

            if (accessibilityEnabled == 1) {
                val settingValue = Settings.Secure.getString(
                    context.contentResolver,
                    Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
                )
                if (settingValue != null) {
                    stringColonSplitter.setString(settingValue)
                    while (stringColonSplitter.hasNext()) {
                        val accessibilityService = stringColonSplitter.next()
                        if (accessibilityService.equals(service, ignoreCase = true) ||
                            accessibilityService.equals(serviceShort, ignoreCase = true) ||
                            accessibilityService.contains("VoiceGuardAccessibilityService")) {
                            return true
                        }
                    }
                }
            }
            return isServiceRunning
        }
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
        isServiceRunning = true

        val info = AccessibilityServiceInfo().apply {
            eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            flags = AccessibilityServiceInfo.FLAG_DEFAULT or AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS
            notificationTimeout = 100
        }
        serviceInfo = info
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return

        val pkgName = event.packageName?.toString() ?: ""
        // Check for dialer or telecom package signatures
        if (pkgName.contains("dialer") || pkgName.contains("incall") || pkgName.contains("telecom")) {
            // Coordinate call active hints
        }
    }

    override fun onInterrupt() {
        // Handle interruption
    }

    override fun onDestroy() {
        super.onDestroy()
        isServiceRunning = false
        instance = null
    }
}
