import numpy as np
from app.model.detector import VoiceGuardDetector
from app.model.labels import VoiceLabel

def test_model_predict_silence():
    detector = VoiceGuardDetector.get_instance()
    silence = np.zeros(16000 * 5, dtype=np.float32)
    res = detector.predict(silence, sample_rate=16000)
    assert res.label == VoiceLabel.UNKNOWN
    assert res.confidence == 0.0

def test_model_predict_audio_signal():
    detector = VoiceGuardDetector.get_instance()
    t = np.linspace(0, 5.0, 16000 * 5, endpoint=False)
    # Synthetic multi-tone signal
    signal = (0.4 * np.sin(2 * np.pi * 300 * t) + 0.3 * np.sin(2 * np.pi * 1200 * t)).astype(np.float32)
    res = detector.predict(signal, sample_rate=16000)
    assert res.aiRisk >= 0.0 and res.aiRisk <= 1.0
    assert res.confidence >= 0.0 and res.confidence <= 1.0
    assert res.timestamp > 0
