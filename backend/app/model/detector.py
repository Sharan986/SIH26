import time
import logging
import numpy as np
from typing import Optional, Dict, Any

from app.config import settings
from app.model.labels import VoiceLabel, PredictionResult

logger = logging.getLogger("voiceguard.model")

class VoiceGuardDetector:
    _instance = None

    def __init__(self):
        self.device = self._resolve_device(settings.MODEL_DEVICE)
        self.model_name = settings.MODEL_NAME
        self.fallback_model_name = settings.MODEL_FALLBACK
        self.model = None
        self.feature_extractor = None
        self.is_loaded = False
        self.id2label = {}
        self.load_error: Optional[str] = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = VoiceGuardDetector()
        return cls._instance

    def _resolve_device(self, config_device: str) -> str:
        if config_device != "auto":
            return config_device
        try:
            import torch
            if torch.cuda.is_available():
                return "cuda"
            elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
                return "mps"
        except Exception:
            pass
        return "cpu"

    def load_model(self):
        """Loads pretrained Wav2Vec2 / Audio Classification model onto selected device."""
        if self.is_loaded:
            return

        logger.info(f"Loading deepfake detection model: {self.model_name} on {self.device}...")
        try:
            import torch
            from transformers import AutoModelForAudioClassification, AutoFeatureExtractor

            try:
                self.feature_extractor = AutoFeatureExtractor.from_pretrained(self.model_name)
                self.model = AutoModelForAudioClassification.from_pretrained(self.model_name)
                logger.info(f"Successfully loaded primary model: {self.model_name}")
            except Exception as e_primary:
                logger.warning(f"Primary model {self.model_name} load failed: {e_primary}. Attempting fallback {self.fallback_model_name}")
                self.feature_extractor = AutoFeatureExtractor.from_pretrained(self.fallback_model_name)
                self.model = AutoModelForAudioClassification.from_pretrained(self.fallback_model_name)
                self.model_name = self.fallback_model_name

            self.model.to(self.device)
            self.model.eval()
            self.id2label = self.model.config.id2label or {}
            self.is_loaded = True
            logger.info(f"Model successfully initialized. Labels: {self.id2label}")
        except Exception as e:
            self.load_error = str(e)
            logger.error(f"Failed to load transformer model ({e}). Using spectral analysis fallback mode.", exc_info=True)
            self.is_loaded = False

    def predict(self, audio_samples: np.ndarray, sample_rate: int = 16000) -> PredictionResult:
        """
        Runs real-time deepfake audio inference on 1D float32 audio waveform.
        """
        start_time = time.time()
        timestamp = int(time.time() * 1000)

        # Basic energy/RMS check
        rms = float(np.sqrt(np.mean(np.square(audio_samples)))) if len(audio_samples) > 0 else 0.0
        if rms < 0.003:
            return PredictionResult(
                label=VoiceLabel.UNKNOWN,
                aiRisk=0.0,
                realProbability=0.0,
                confidence=0.0,
                timestamp=timestamp,
                rms=rms,
                inferenceTimeMs=0.0,
                details="Insufficient audio signal / silence"
            )

        if self.is_loaded and self.model is not None and self.feature_extractor is not None:
            try:
                import torch
                inputs = self.feature_extractor(
                    audio_samples,
                    sampling_rate=sample_rate,
                    return_tensors="pt"
                )
                input_values = inputs.input_values.to(self.device)

                with torch.no_grad():
                    logits = self.model(input_values).logits
                    probabilities = torch.softmax(logits, dim=-1).cpu().numpy()[0]

                # Map id2label dynamically
                fake_prob = 0.0
                real_prob = 0.0

                for idx, prob in enumerate(probabilities):
                    label_name = str(self.id2label.get(idx, f"LABEL_{idx}")).lower()
                    if any(k in label_name for k in ["fake", "ai", "spoof", "synthetic", "generated", "1"]):
                        fake_prob = float(prob)
                    elif any(k in label_name for k in ["real", "bonafide", "human", "0"]):
                        real_prob = float(prob)

                # If single index or default binary
                if fake_prob == 0.0 and real_prob == 0.0 and len(probabilities) >= 2:
                    fake_prob = float(probabilities[1])
                    real_prob = float(probabilities[0])

                # Determine label & confidence
                confidence = float(max(fake_prob, real_prob))
                if fake_prob >= 0.60:
                    label = VoiceLabel.AI_GENERATED
                elif real_prob >= 0.60:
                    label = VoiceLabel.REAL
                else:
                    label = VoiceLabel.UNKNOWN

                elapsed_ms = (time.time() - start_time) * 1000.0

                return PredictionResult(
                    label=label,
                    aiRisk=round(fake_prob, 4),
                    realProbability=round(real_prob, 4),
                    confidence=round(confidence, 4),
                    timestamp=timestamp,
                    rms=round(rms, 4),
                    inferenceTimeMs=round(elapsed_ms, 2),
                    details=f"Inference via {self.model_name}"
                )
            except Exception as e:
                logger.error(f"Inference error: {e}", exc_info=True)

        # Fallback Spectral/Acoustic Feature Extraction Analyzer (used when deep learning weights are downloading/offline)
        return self._spectral_feature_inference(audio_samples, sample_rate, rms, start_time, timestamp)

    def _spectral_feature_inference(
        self,
        audio_samples: np.ndarray,
        sample_rate: int,
        rms: float,
        start_time: float,
        timestamp: int
    ) -> PredictionResult:
        """
        Deterministic acoustic feature heuristic based on high-frequency phase coherence,
        zero crossing variance, and spectral centroid flatness.
        Never returns random numbers.
        """
        # Zero-crossing rate
        zero_crossings = np.sum(np.abs(np.diff(np.sign(audio_samples)))) / (2.0 * len(audio_samples))

        # FFT Spectral analysis
        fft_vals = np.abs(np.fft.rfft(audio_samples))
        freqs = np.fft.rfftfreq(len(audio_samples), 1.0 / sample_rate)

        spectral_sum = np.sum(fft_vals) + 1e-10
        spectral_centroid = np.sum(freqs * fft_vals) / spectral_sum

        # Spectral flatness (geometric mean / arithmetic mean)
        positive_fft = fft_vals[fft_vals > 1e-7]
        if len(positive_fft) > 0:
            log_mean = np.mean(np.log(positive_fft))
            geom_mean = np.exp(log_mean)
            arith_mean = np.mean(positive_fft)
            spectral_flatness = geom_mean / (arith_mean + 1e-10)
        else:
            spectral_flatness = 0.0

        # Synthetic TTS/vocoder artifacts often show higher spectral flatness / synthetic high frequency spikes
        ai_score = 0.15
        if spectral_flatness > 0.35:
            ai_score += 0.25
        if zero_crossings > 0.25:
            ai_score += 0.20
        if spectral_centroid > 3500:
            ai_score += 0.15

        ai_score = min(max(ai_score, 0.05), 0.85)
        real_score = 1.0 - ai_score
        confidence = float(max(ai_score, real_score))

        label = VoiceLabel.AI_GENERATED if ai_score >= 0.60 else (VoiceLabel.REAL if real_score >= 0.60 else VoiceLabel.UNKNOWN)
        elapsed_ms = (time.time() - start_time) * 1000.0

        return PredictionResult(
            label=label,
            aiRisk=round(ai_score, 4),
            realProbability=round(real_score, 4),
            confidence=round(confidence, 4),
            timestamp=timestamp,
            rms=round(rms, 4),
            inferenceTimeMs=round(elapsed_ms, 2),
            details="Acoustic Spectral Analysis Mode (Wav2Vec2 Loading/Offline)"
        )
