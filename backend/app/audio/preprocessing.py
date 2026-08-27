import base64
import numpy as np
import scipy.signal
from typing import Tuple, Optional

class AudioPreprocessor:
    def __init__(self, target_sample_rate: int = 16000, target_duration_sec: float = 5.0):
        self.target_sample_rate = target_sample_rate
        self.target_duration_sec = target_duration_sec
        self.target_samples = int(target_sample_rate * target_duration_sec)
        self.silence_rms_threshold = 0.003  # Below this is considered near-silent

    def pcm16_to_float32(self, pcm_bytes: bytes) -> np.ndarray:
        """Convert 16-bit signed PCM little-endian byte stream to normalized float32 array [-1.0, 1.0]."""
        if not pcm_bytes:
            return np.zeros(0, dtype=np.float32)
        # Ensure even byte count for 16-bit samples
        truncate_len = len(pcm_bytes) - (len(pcm_bytes) % 2)
        if truncate_len == 0:
            return np.zeros(0, dtype=np.float32)
        int16_arr = np.frombuffer(pcm_bytes[:truncate_len], dtype=np.int16)
        return (int16_arr.astype(np.float32)) / 32768.0

    def base64_pcm_to_float32(self, base64_str: str) -> np.ndarray:
        """Decode base64 string to float32 audio samples."""
        try:
            pcm_bytes = base64.b64decode(base64_str)
            return self.pcm16_to_float32(pcm_bytes)
        except Exception:
            return np.zeros(0, dtype=np.float32)

    def resample(self, samples: np.ndarray, orig_sr: int) -> np.ndarray:
        """Resample audio to target_sample_rate if different."""
        if orig_sr == self.target_sample_rate or len(samples) == 0:
            return samples
        num_target_samples = int(len(samples) * float(self.target_sample_rate) / orig_sr)
        return scipy.signal.resample(samples, num_target_samples).astype(np.float32)

    def to_mono(self, samples: np.ndarray, channels: int) -> np.ndarray:
        """Convert multi-channel interleaved audio to mono."""
        if channels <= 1 or len(samples) == 0:
            return samples
        samples = samples.reshape(-1, channels)
        return np.mean(samples, axis=1).astype(np.float32)

    def compute_rms(self, samples: np.ndarray) -> float:
        """Compute Root Mean Square energy."""
        if len(samples) == 0:
            return 0.0
        return float(np.sqrt(np.mean(np.square(samples))))

    def preprocess(
        self,
        samples: np.ndarray,
        orig_sr: int = 16000,
        channels: int = 1
    ) -> Tuple[np.ndarray, float, bool, str]:
        """
        Full preprocessing pipeline:
        1. Mono conversion
        2. Resampling to 16kHz
        3. DC Offset removal
        4. Energy calculation & silence validation
        5. Peak normalization
        6. Length standardization (pad or truncate to 5s window)

        Returns: (processed_samples, rms, is_valid, status_message)
        """
        if len(samples) == 0:
            return np.zeros(self.target_samples, dtype=np.float32), 0.0, false, "Empty audio buffer"

        # 1. Mono
        if channels > 1:
            samples = self.to_mono(samples, channels)

        # 2. Resample
        if orig_sr != self.target_sample_rate:
            samples = self.resample(samples, orig_sr)

        # 3. DC Offset removal
        mean_val = np.mean(samples)
        samples = samples - mean_val

        # 4. Energy calculation
        rms = self.compute_rms(samples)
        if rms < self.silence_rms_threshold:
            return samples, rms, False, "Audio energy too low (silence detected)"

        # 5. Normalization
        max_peak = np.max(np.abs(samples))
        if max_peak > 1e-5:
            samples = samples / max_peak

        # 6. Length adjustment
        if len(samples) > self.target_samples:
            # Take the most recent target_samples (last 5 seconds)
            samples = samples[-self.target_samples:]
        elif len(samples) < self.target_samples:
            # Pad with zeros or repeat signal
            pad_amount = self.target_samples - len(samples)
            samples = np.pad(samples, (0, pad_amount), mode='constant')

        return samples.astype(np.float32), rms, True, "OK"
