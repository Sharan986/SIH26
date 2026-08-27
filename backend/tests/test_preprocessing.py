import numpy as np
import base64
from app.audio.preprocessing import AudioPreprocessor

def test_pcm16_to_float32():
    preprocessor = AudioPreprocessor()
    # 2 samples of 16-bit audio (0 and 32767)
    raw_bytes = (0).to_bytes(2, byteorder='little', signed=True) + (32767).to_bytes(2, byteorder='little', signed=True)
    float_samples = preprocessor.pcm16_to_float32(raw_bytes)
    assert len(float_samples) == 2
    assert np.isclose(float_samples[0], 0.0)
    assert np.isclose(float_samples[1], 32767 / 32768.0, atol=1e-3)

def test_preprocessing_pipeline():
    preprocessor = AudioPreprocessor(target_sample_rate=16000, target_duration_sec=5.0)
    # Generate 1-second 440Hz sine wave
    t = np.linspace(0, 1.0, 16000, endpoint=False)
    sine = (0.5 * np.sin(2 * np.pi * 440 * t)).astype(np.float32)

    processed, rms, is_valid, msg = preprocessor.preprocess(sine, orig_sr=16000, channels=1)
    assert is_valid is True
    assert len(processed) == 16000 * 5
    assert rms > 0.0
