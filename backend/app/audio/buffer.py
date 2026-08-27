import numpy as np
from typing import List

class AudioStreamBuffer:
    """
    Session-specific audio streaming buffer that accumulates streaming PCM frames
    and yields standardized 5-second windows for inference.
    """
    def __init__(self, sample_rate: int = 16000, window_duration_sec: float = 5.0):
        self.sample_rate = sample_rate
        self.window_samples = int(sample_rate * window_duration_sec)
        self.buffer = np.zeros(0, dtype=np.float32)
        self.total_samples_received = 0

    def append(self, samples: np.ndarray):
        if len(samples) == 0:
            return
        self.buffer = np.concatenate((self.buffer, samples))
        self.total_samples_received += len(samples)

        # Keep buffer bounded to max 2x window to prevent memory buildup
        max_buf_len = self.window_samples * 2
        if len(self.buffer) > max_buf_len:
            self.buffer = self.buffer[-max_buf_len:]

    def get_latest_window(self) -> np.ndarray:
        """Returns up to the latest window_samples."""
        if len(self.buffer) == 0:
            return np.zeros(self.window_samples, dtype=np.float32)
        if len(self.buffer) >= self.window_samples:
            return self.buffer[-self.window_samples:]
        # Pad if less than window size
        pad_size = self.window_samples - len(self.buffer)
        return np.pad(self.buffer, (pad_size, 0), mode='constant')

    def has_sufficient_audio(self, min_duration_sec: float = 1.5) -> bool:
        min_samples = int(self.sample_rate * min_duration_sec)
        return len(self.buffer) >= min_samples

    def clear(self):
        self.buffer = np.zeros(0, dtype=np.float32)
        self.total_samples_received = 0
