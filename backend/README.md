# VoiceGuard AI Detection Backend

FastAPI service powering the real-time AI voice authenticity detection engine using pretrained Wav2Vec2 / Audio Classification models.

## Pretrained Models
- **Primary**: `MelodyMachine/Deepfake-audio-detection-V2`
- **Fallback**: `Gustking/wav2vec2-large-xlsr-deepfake-audio-classification`
- **Offline / Test Mode**: High-coherence acoustic spectral feature extraction

## Endpoints
- `GET /health`: Health status, loaded model name, compute device (`cpu`, `cuda`, `mps`).
- `POST /analyze`: Single inference analysis for audio files or Base64 PCM payloads.
- `WebSocket /ws/analyze`: Real-time bi-directional streaming for rolling 5-second call audio windows.

## Running Locally

```bash
# 1. Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Start server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Running Tests
```bash
pytest
```
