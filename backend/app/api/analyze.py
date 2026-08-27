from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
import io
import json
import soundfile as sf
import numpy as np

from app.audio.preprocessing import AudioPreprocessor
from app.model.detector import VoiceGuardDetector
from app.model.labels import PredictionResult

router = APIRouter()
preprocessor = AudioPreprocessor()

class AnalyzeJsonRequest(BaseModel):
    audioBase64: str
    sampleRate: Optional[int] = 16000
    channels: Optional[int] = 1

@router.post("/analyze", response_model=PredictionResult)
async def analyze_audio(request: Request):
    detector = VoiceGuardDetector.get_instance()
    content_type = request.headers.get("content-type", "")

    if "application/json" in content_type:
        try:
            body = await request.json()
            payload = AnalyzeJsonRequest(**body)
            samples = preprocessor.base64_pcm_to_float32(payload.audioBase64)
            sr = payload.sampleRate or 16000
            channels = payload.channels or 1
            processed, rms, is_valid, msg = preprocessor.preprocess(samples, orig_sr=sr, channels=channels)
            if not is_valid:
                return detector.predict(np.zeros(16000 * 5, dtype=np.float32), sr)
            return detector.predict(processed, sr)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid JSON payload: {e}")

    elif "multipart/form-data" in content_type:
        form = await request.form()
        file = form.get("file")
        if not file or not hasattr(file, "read"):
            raise HTTPException(status_code=400, detail="Form field 'file' is required.")
        contents = await file.read()
        try:
            audio_data, sr = sf.read(io.BytesIO(contents))
            if audio_data.ndim > 1:
                audio_data = np.mean(audio_data, axis=1)
            processed, rms, is_valid, msg = preprocessor.preprocess(audio_data.astype(np.float32), orig_sr=sr, channels=1)
            return detector.predict(processed, 16000)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to process audio file: {e}")

    raise HTTPException(status_code=400, detail="Content-Type must be application/json or multipart/form-data")
