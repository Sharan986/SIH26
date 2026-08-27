# VoiceGuard — AI Voice Authenticity Android Application & Backend

VoiceGuard is an AI-powered voice authenticity detection application designed to analyze the voice of the other person during a live cellular phone call and estimate whether the speech is human or AI-generated (deepfake/voice clone).

---

## 1. System Overview

VoiceGuard operates in real time alongside standard cellular phone calls on Android devices:
1. **Telephony & Accessibility Monitoring**: Detects when a normal cellular call becomes active.
2. **Audio Capture Engine**: Samples call audio via Android's permitted audio communication path (`AudioRecord` with 16kHz 16-bit Mono PCM).
3. **Rolling Buffer**: Manages a 5-second circular ring buffer, extracting analysis windows every 2.5 seconds.
4. **WebSocket AI Stream**: Streams PCM audio frames to a high-performance FastAPI backend.
5. **Wav2Vec2 Machine Learning**: Analyzes acoustic features using pretrained deep learning models (`MelodyMachine/Deepfake-audio-detection-V2` / `Gustking/wav2vec2-large-xlsr-deepfake-audio-classification`).
6. **Exponential Moving Average Smoothing**: Stabilizes probability scores on the mobile UI without jerky metric jumps.
7. **Transparent UX**: Displays real-time risk gauges, waveforms, confidence levels, and persistent local call history.

---

## 2. Project Architecture

```
voiceguard/
├── app/                              # Expo Router file-based screens
│   ├── _layout.tsx                   # Root Stack layout
│   ├── index.tsx                     # Entry check & redirect
│   ├── onboarding/                   # 3-step walkthrough & permissions
│   │   ├── index.tsx
│   │   ├── permissions.tsx
│   │   └── accessibility.tsx
│   ├── (tabs)/                       # Main Tab navigation
│   │   ├── _layout.tsx
│   │   ├── home.tsx                  # Security/AI Dashboard
│   │   ├── history.tsx               # Persistent session history
│   │   └── settings.tsx              # Settings & device diagnostics
│   ├── live/                         # Live Call Analysis
│   │   ├── index.tsx                 # Real-time risk meter & waveform
│   │   └── result.tsx                # Post-call evaluation summary
│   ├── history/
│   │   └── [id].tsx                  # Historical analysis & risk timeline chart
│   └── settings/
│       ├── permissions.tsx           # Hardware permissions & capabilities
│       ├── privacy.tsx               # Privacy policy & data disclosures
│       ├── model.tsx                 # ML model architecture & parameters
│       └── dev-test.tsx              # Developer model test harness
├── components/                       # Modular UI components
│   ├── ui/                           # CircularRiskGauge, WaveformVisualizer, Buttons, Cards
│   ├── call/                         # CallStateBanner, AudioCapabilityBadge
│   ├── analysis/                     # RiskTimelineChart
│   └── history/                      # HistoryCard
├── hooks/                            # Custom React Hooks
│   ├── useCallState.ts
│   ├── useCallAudio.ts
│   ├── useAnalysis.ts
│   ├── usePermissions.ts
│   └── useHistory.ts
├── services/                         # Core service layer
│   ├── api.ts                        # REST client for FastAPI
│   ├── websocket.ts                  # Resilient WebSocket streaming client
│   ├── storage.ts                    # AsyncStorage local history
│   └── device.ts                     # Device capabilities prober
├── store/                            # State stores
│   ├── analysisStore.ts              # Real-time state & EMA risk smoother
│   └── settingsStore.ts              # App configurations
├── types/                            # TypeScript interfaces & types
├── modules/
│   └── call-audio/                   # Custom Native Android Expo Module (Kotlin)
│       ├── android/
│       │   ├── src/main/AndroidManifest.xml
│       │   ├── src/main/res/xml/accessibility_service_config.xml
│       │   └── src/main/java/expo/modules/callaudio/
│       │       ├── CallAudioModule.kt
│       │       ├── VoiceGuardAccessibilityService.kt
│       │       ├── CallStateReceiver.kt
│       │       ├── AudioCaptureEngine.kt
│       │       ├── RingBuffer.kt
│       │       └── AudioCapabilityDetector.kt
│       └── src/index.ts              # Native bridge & event emitter
├── backend/                          # Python FastAPI ML Backend
│   ├── app/
│   │   ├── main.py                   # FastAPI server entrypoint
│   │   ├── config.py                 # App settings & env variables
│   │   ├── api/                      # REST & WebSocket endpoints
│   │   │   ├── health.py
│   │   │   ├── analyze.py
│   │   │   └── websocket.py
│   │   ├── audio/                    # Audio preprocessing & buffering
│   │   │   ├── preprocessing.py
│   │   │   └── buffer.py
│   │   └── model/                    # ML Model loader & inference
│   │       ├── detector.py
│   │       └── labels.py
│   └── tests/                        # Backend pytest suite
├── docs/                             # Deep documentation
│   ├── ARCHITECTURE.md
│   ├── ANDROID_SETUP.md
│   └── TROUBLESHOOTING.md
├── app.json
└── package.json
```

---

## 3. Installation & Setup

### Prerequisites
- **Node.js**: v18+ or **Bun** v1.0+
- **Python**: 3.9+
- **Android Studio** & JDK 17 (for Android builds)

### Mobile Installation
```bash
# 1. Install dependencies
bun install
# or: npm install

# 2. Start Expo Development Server
bun start
# or: npx expo start
```

### Backend Installation & Startup
```bash
# 1. Navigate to backend
cd backend

# 2. Create virtual environment
python3 -m venv venv
source venv/bin/activate

# 3. Install requirements
pip install -r requirements.txt

# 4. Start FastAPI server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 4. Android Build Instructions

VoiceGuard utilizes custom native Kotlin modules and must be run via an Expo Development Build:

```bash
# Generate native Android project
npx expo prebuild --platform android

# Run on connected physical device or emulator
npx expo run:android
```

---

## 5. Physical Device & Cellular Call Test Procedure

### Two-Phone Live Call Test
1. **Phone A**: Standard cellular phone (Caller).
2. **Phone B**: Android device running VoiceGuard connected to FastAPI backend.

### Verification Flow:
1. On **Phone B**, open **VoiceGuard** and verify that Microphone & Accessibility permissions are enabled.
2. In **Settings**, confirm the FastAPI Server URL matches your computer's local IP (e.g. `http://192.168.1.15:8000`).
3. Place a cellular call from **Phone A** to **Phone B**.
4. Answer the call on **Phone B**.
5. Switch to VoiceGuard and tap **Start Voice Check** (or **Analyze Active Call Now**).
6. Verify:
   - Call status displays `Call Active`.
   - Audio Waveform bars react to speech cadence.
   - Circular Gauge updates smoothly (0–30% Likely Real, 31–60% Inconclusive, 61–100% Possible AI Voice).
7. End the cellular call.
8. Verify the session stops, the final risk summary is displayed on `/live/result`, and is saved to **History**.

---

## 6. Important Android Platform Limitations & Security

> [!IMPORTANT]
> **Android Platform Restriction Note**:
> Android 10+ (API 29+) explicitly prohibits standard third-party applications from capturing raw downlink cellular audio (`VOICE_DOWNLINK` / `VOICE_CALL`) without signature/carrier permissions.
> 
> VoiceGuard does **NOT** use hidden APIs, root exploits, or fake simulated data. It captures the acoustic voice communication path (`MediaRecorder.AudioSource.VOICE_COMMUNICATION` / `MIC` with hardware Acoustic Echo Cancellation). The built-in **Audio Capability Detector** checks the target device and displays whether direct call downlink or acoustic sampling is active.

---

## 7. Model Disclaimer

> [!NOTE]
> VoiceGuard provides an AI-based risk assessment. It is not definitive proof that a voice is synthetic.
