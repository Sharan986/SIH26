# Android Setup & Development Build Guide

VoiceGuard requires Android development builds because it includes custom native Kotlin modules for telephony tracking, ring buffer audio capture, and accessibility services.

## Prerequisites
- Android Studio Ladybug or newer
- JDK 17
- Android SDK API 34 / 35
- Physical Android Device or Android Emulator (API 26+)

## Step-by-Step Setup

### 1. Generate Native Android Project
Run Expo prebuild to generate the native Android project folder:
```bash
bun run prebuild
# Or
npx expo prebuild --platform android
```

### 2. Run Android Development Build
To build and run directly on your connected device:
```bash
bun run android
# Or
npx expo run:android
```

### 3. Grant Permissions on Device
Once installed on your physical device:
1. Open **VoiceGuard**.
2. Complete the 3-step Onboarding walkthrough.
3. In the **Permission Center**:
   - Tap **Grant Access** for Microphone (`RECORD_AUDIO`).
   - Tap **Enable Service** to open Android Accessibility Settings.
   - Select **VoiceGuard Call Safety Service** and toggle to **On**.

### 4. Connect to Backend Server
If testing on a physical Android phone on the same Wi-Fi network:
1. Find your development machine's local IP address (e.g. `192.168.1.15`).
2. Go to **Settings > FastAPI Server URL** inside VoiceGuard.
3. Enter `http://192.168.1.15:8000`.
4. Tap **Save**.
5. Enable **Developer Diagnostics Mode** and tap **Open Model Testing Suite** to verify communication.
