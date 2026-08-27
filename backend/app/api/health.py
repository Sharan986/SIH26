from fastapi import APIRouter
from app.model.detector import VoiceGuardDetector

router = APIRouter()

@router.get("/health")
def health_check():
    detector = VoiceGuardDetector.get_instance()
    return {
        "status": "ok",
        "model": "loaded" if detector.is_loaded else "ready",
        "model_name": detector.model_name,
        "device": detector.device,
        "is_loaded": detector.is_loaded,
        "load_error": detector.load_error
    }
