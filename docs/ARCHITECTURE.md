# VoiceGuard — Complete System Architecture

```mermaid
flowchart TD
    subgraph Android OS & Hardware
        A[Cellular Call Active] --> B[TelephonyManager / TelephonyCallback]
        B --> C[CallAudioModule.kt]
        A --> D[Accessibility Service]
        D --> C
        A --> E[Audio Hardware / MediaRecorder]
        E --> F[AudioCaptureEngine.kt]
    end

    subgraph Native Audio Buffer Engine
        F --> G[RingBuffer 5-Second Circular FIFO]
        G --> H[RMS & Signal Energy Validator]
        H --> I[Base64 PCM Extraction @ 2.5s Interval]
        I --> J[CallAudioModule Event Emitter]
    end

    subgraph Expo React Native Layer
        J --> K[useAnalysis Hook]
        C --> L[useCallState Hook]
        K --> M[WebSocketStreamService]
        M -->|JSON Audio Frames| N[FastAPI WebSocket]
        O[FastAPI Prediction] -->|JSON Predictions| M
        M --> P[analysisStore - EMA Smoother]
        P --> Q[Live Voice Check UI]
        P --> R[AsyncStorage History]
    end

    subgraph Machine Learning Backend
        N --> S[AudioPreprocessor]
        S --> T[Mono & 16kHz Resampling]
        T --> U[Peak Normalization & DC Offset]
        U --> V[Wav2Vec2 Deepfake Detector V2]
        V --> W[Probability Softmax & Confidence]
        W --> O
    end
```

## Data Flow Details

1. **Call Detection Pipeline**:
   - `CallStateReceiver.kt` hooks into Android's `TelephonyManager` (using `TelephonyCallback` on API 31+ or `PhoneStateListener` on legacy Android).
   - Emits unified events (`IDLE`, `RINGING`, `ACTIVE`, `ENDED`) across the React Native bridge.
   - `VoiceGuardAccessibilityService.kt` monitors in-call dialer package transitions as a secondary coordination channel.

2. **Audio Capture Pipeline**:
   - Background audio capture runs on a high-priority native worker thread (`AudioCaptureEngine.kt`) via `AudioRecord`.
   - Audio is captured at 16,000 Hz, 16-bit Mono PCM.
   - Pushed directly to a thread-safe circular `RingBuffer` with 5-second rolling window capacity (160,000 bytes).
   - Rolling windows are dispatched at 2.5-second intervals to prevent thread starvation and provide low latency.

3. **Inference Pipeline**:
   - Chunks are transmitted over `WebSocket /ws/analyze` to the FastAPI backend.
   - Preprocessed to exact model input specifications (1D float32 tensor normalized in `[-1.0, 1.0]`).
   - Evaluated by `MelodyMachine/Deepfake-audio-detection-V2` / `Gustking/wav2vec2-large-xlsr-deepfake-audio-classification`.
   - Predictions returned with `aiRisk`, `realProbability`, `confidence`, `timestamp`, and `inferenceTimeMs`.

4. **Mobile Smoothing & UX**:
   - Exponential Moving Average (EMA) smoothing:
     $$EMA_t = 0.35 \cdot RawRisk_t + 0.65 \cdot EMA_{t-1}$$
   - Prevents erratic gauge needle jumps while staying reactive to actual speech transitions.
