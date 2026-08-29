"""
HuggingFace Space Client for Voice Deepfake Detection.
Sends a WAV audio segment to the deployed Gradio Space and returns a prediction.

Space URL: https://huggingface.co/spaces/starfish007/voice-deepfake-detector
API Protocol: Gradio Client (v3 queue API)

Response from Space: [label, confidence, confidence]
  label: "REAL" | "AI-GENERATED"
  confidence: float (0.0 to 100.0)
"""
import io
import time
import logging
import tempfile
import os
import numpy as np
from typing import Tuple

logger = logging.getLogger("voiceguard.hf_client")

HF_SPACE_URL = "starfish007/voice-deepfake-detector"

class HFSpaceClient:
    """
    Thin async wrapper around gradio_client to call the HF Space API.
    Uses a lazy singleton — the Gradio client is only instantiated once.
    """
    _instance = None
    _client = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = HFSpaceClient()
        return cls._instance

    def _get_client(self):
        """Lazy-load the Gradio client."""
        if self._client is None:
            try:
                from gradio_client import Client
                self._client = Client(HF_SPACE_URL, verbose=False)
                logger.info(f"[HFSpaceClient] Gradio client connected to {HF_SPACE_URL}")
            except Exception as e:
                logger.error(f"[HFSpaceClient] Failed to connect to HF Space: {e}")
                self._client = None
        return self._client

    def predict(self, audio_samples: np.ndarray, sample_rate: int = 16000) -> Tuple[str, float, float]:
        """
        Sends audio_samples (float32, mono, 16kHz) to the HF Space and returns:
            (label, fake_confidence, real_confidence)
        
        Returns ("UNKNOWN", 0.0, 0.0) on failure.
        """
        client = self._get_client()
        if client is None:
            return ("UNKNOWN", 0.0, 0.0)

        tmp_path = None
        try:
            import soundfile as sf

            # Write to a temp WAV file — Gradio requires a file path or file-like object
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                tmp_path = tmp.name

            sf.write(tmp_path, audio_samples, samplerate=sample_rate, format="WAV", subtype="PCM_16")
            logger.debug(f"[HFSpaceClient] Sending {len(audio_samples)/sample_rate:.2f}s audio to HF Space")

            start = time.time()
            result = client.predict(tmp_path, api_name="/predict")
            elapsed_ms = (time.time() - start) * 1000

            # Expected result format: [label, confidence, confidence]
            # e.g. ["REAL", 70.05, 70.05] or ["AI-GENERATED", 88.3, 88.3]
            if isinstance(result, (list, tuple)) and len(result) >= 1:
                label = str(result[0]).strip().upper()
                # Normalise label to our internal vocabulary
                if "GENERATED" in label or "AI" in label or "FAKE" in label or "SPOOF" in label:
                    label = "AI-GENERATED"
                elif "REAL" in label or "HUMAN" in label or "BONAFIDE" in label:
                    label = "REAL"
                else:
                    label = "UNKNOWN"

                raw_confidence = float(result[1]) if len(result) > 1 else 50.0
                # Space returns confidence as 0-100; normalise to 0.0-1.0
                confidence = min(max(raw_confidence / 100.0, 0.0), 1.0)

                if label == "AI-GENERATED":
                    fake_conf = confidence
                    real_conf = 1.0 - confidence
                elif label == "REAL":
                    real_conf = confidence
                    fake_conf = 1.0 - confidence
                else:
                    fake_conf = real_conf = 0.0

                logger.info(f"[HFSpaceClient] {label} (fake={fake_conf:.2f}, real={real_conf:.2f}) in {elapsed_ms:.0f}ms")
                return (label, round(fake_conf, 4), round(real_conf, 4))
            else:
                logger.warning(f"[HFSpaceClient] Unexpected response format: {result}")
                return ("UNKNOWN", 0.0, 0.0)

        except Exception as e:
            logger.error(f"[HFSpaceClient] Prediction error: {e}", exc_info=True)
            # Reset client so it reconnects next call
            self._client = None
            return ("UNKNOWN", 0.0, 0.0)
        finally:
            if tmp_path and os.path.exists(tmp_path):
                try:
                    os.remove(tmp_path)
                except Exception:
                    pass
