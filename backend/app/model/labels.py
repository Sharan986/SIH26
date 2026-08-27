from enum import Enum
from pydantic import BaseModel

class VoiceLabel(str, Enum):
    REAL = "REAL"
    AI_GENERATED = "AI_GENERATED"
    UNKNOWN = "UNKNOWN"

class PredictionResult(BaseModel):
    type: str = "prediction"
    label: VoiceLabel
    aiRisk: float
    realProbability: float
    confidence: float
    timestamp: int
    rms: float = 0.0
    inferenceTimeMs: float = 0.0
    details: str = ""
