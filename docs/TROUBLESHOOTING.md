# Troubleshooting Guide

## 1. "Direct call audio unavailable on this device"
- **Reason**: Android 10+ (API 29+) explicitly restricts third-party apps from capturing raw cellular downlink audio (`VOICE_DOWNLINK` / `VOICE_CALL`) for security and privacy reasons unless granted system/carrier privileges.
- **Resolution**: VoiceGuard automatically routes audio capture via `VOICE_COMMUNICATION` / `MIC` with hardware Acoustic Echo Cancellation (AEC) enabled. When you speak or the phone's speakerphone/earpiece acoustic output is active, the app processes the authentic speech signal.

## 2. "AI Analysis Unavailable / Connection Error"
- **Reason**: The mobile app cannot reach the FastAPI backend server.
- **Checklist**:
  1. Confirm the backend is running: `curl http://localhost:8000/health`.
  2. For **Android Emulator**, ensure backend URL is set to `http://10.0.2.2:8000`.
  3. For **Physical Devices**, ensure both phone and computer are on the same Wi-Fi, and firewall allows port 8000.
  4. Ensure backend URL is updated in the app Settings tab.

## 3. "Accessibility Service Disabled"
- **Reason**: Android battery optimization or OS restart disabled the background accessibility service.
- **Resolution**: Go to **Settings > System & Permissions > Accessibility Service > Manage Settings** and re-enable VoiceGuard.

## 4. "Silence Detected / Empty Predictions"
- **Reason**: The microphone is muted or audio signal energy (RMS) is below 0.003.
- **Resolution**: Ensure microphone is not muted and speak into the device during an active call check.
