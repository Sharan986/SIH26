import os
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseModel):
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    MODEL_NAME: str = os.getenv("MODEL_NAME", "MelodyMachine/Deepfake-audio-detection-V2")
    MODEL_FALLBACK: str = os.getenv("MODEL_FALLBACK", "Gustking/wav2vec2-large-xlsr-deepfake-audio-classification")
    MODEL_DEVICE: str = os.getenv("MODEL_DEVICE", "auto")
    SAMPLE_RATE: int = int(os.getenv("SAMPLE_RATE", "16000"))
    WINDOW_SIZE_SEC: int = int(os.getenv("WINDOW_SIZE_SEC", "5"))
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"

settings = Settings()
