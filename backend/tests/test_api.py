import base64
import numpy as np
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "model" in data

def test_analyze_json_endpoint():
    # 1 second of 440Hz PCM 16-bit audio encoded in base64
    t = np.linspace(0, 1.0, 16000, endpoint=False)
    int16_samples = (np.sin(2 * np.pi * 440 * t) * 16000).astype(np.int16)
    raw_bytes = int16_samples.tobytes()
    b64_audio = base64.b64encode(raw_bytes).decode('utf-8')

    response = client.post("/analyze", json={
        "audioBase64": b64_audio,
        "sampleRate": 16000,
        "channels": 1
    })
    assert response.status_code == 200
    data = response.json()
    assert "label" in data
    assert "aiRisk" in data
    assert "confidence" in data
