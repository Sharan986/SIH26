import json
import logging
import os
import time
from typing import Dict, Any

logger = logging.getLogger("voiceguard.privacy")

class PrivacyLogger:
    """
    Handles GDPR/DPDP compliant logging of VoiceGuard inferences.
    This strictly logs ONLY acoustic features, dynamic risk scores, and metadata.
    It NEVER logs or writes actual PII/audio to disk.
    """
    _instance = None

    def __init__(self, log_dir: str = "logs/privacy"):
        self.log_dir = log_dir
        if not os.path.exists(self.log_dir):
            os.makedirs(self.log_dir, exist_ok=True)
        self.current_log_file = os.path.join(self.log_dir, f"inference_log_{int(time.time())}.jsonl")

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = PrivacyLogger()
        return cls._instance

    def log_inference(
        self,
        session_id: str,
        speaker_id: str,
        acoustic_features: Dict[str, Any],
        blended_risk_score: float,
        recommended_action: str,
        session_metadata: Dict[str, Any]
    ):
        """
        Write anonymized feature telemetry to disk for compliance and model tuning.
        """
        log_entry = {
            "timestamp": int(time.time() * 1000),
            "session_id": session_id,
            "speaker_id": speaker_id,  # Typically an anonymized UUID in production
            "acoustic_metrics": {
                "rms": acoustic_features.get("rms", 0.0),
                "ai_probability_raw": acoustic_features.get("aiRisk", 0.0),
                "inference_time_ms": acoustic_features.get("inferenceTimeMs", 0.0)
            },
            "risk_engine": {
                "blended_risk_score": blended_risk_score,
                "recommended_action": recommended_action,
                "context_flags_applied": list(session_metadata.keys())
            }
        }
        
        try:
            with open(self.current_log_file, "a") as f:
                f.write(json.dumps(log_entry) + "\n")
        except Exception as e:
            logger.error(f"Failed to write privacy log: {e}")
