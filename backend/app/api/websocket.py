import json
import logging
from typing import Dict
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.audio.preprocessing import AudioPreprocessor
from app.audio.buffer import AudioStreamBuffer
from app.model.detector import VoiceGuardDetector

logger = logging.getLogger("voiceguard.ws")
router = APIRouter()

class ConnectionManager:
    def __init__(self):
        # Maps session_id -> list of (websocket, client_id)
        self.active_sessions: Dict[str, list] = {}

    async def connect(self, websocket: WebSocket, session_id: str, client_id: str):
        await websocket.accept()
        if session_id not in self.active_sessions:
            self.active_sessions[session_id] = []
        self.active_sessions[session_id].append((websocket, client_id))

    def disconnect(self, websocket: WebSocket, session_id: str):
        if session_id in self.active_sessions:
            self.active_sessions[session_id] = [c for c in self.active_sessions[session_id] if c[0] != websocket]
            if not self.active_sessions[session_id]:
                del self.active_sessions[session_id]

    async def broadcast(self, message: dict, session_id: str):
        if session_id in self.active_sessions:
            for connection, _ in self.active_sessions[session_id]:
                try:
                    await connection.send_text(json.dumps(message))
                except Exception:
                    pass

manager = ConnectionManager()

@router.websocket("/ws/analyze/{session_id}/{client_id}")
async def websocket_analyze_stream(websocket: WebSocket, session_id: str, client_id: str):
    await manager.connect(websocket, session_id, client_id)
    logger.info(f"WebSocket client {client_id} connected to session {session_id}")

    preprocessor = AudioPreprocessor()
    buffer = AudioStreamBuffer(sample_rate=16000, window_duration_sec=5.0)
    detector = VoiceGuardDetector.get_instance()
    sample_rate = 16000
    channels = 1

    try:
        await websocket.send_text(json.dumps({
            "type": "connected",
            "message": "VoiceGuard Real-time AI Audio Stream Connected"
        }))

        while True:
            raw_msg = await websocket.receive_text()
            try:
                data = json.loads(raw_msg)
            except Exception:
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "code": "INVALID_JSON",
                    "message": "Payload must be valid JSON"
                }))
                continue

            msg_type = data.get("type", "")

            if msg_type == "start":
                sample_rate = data.get("sampleRate", 16000)
                channels = data.get("channels", 1)
                buffer.clear()
                await websocket.send_text(json.dumps({
                    "type": "started",
                    "sampleRate": sample_rate,
                    "channels": channels
                }))

            elif msg_type == "audio":
                audio_b64 = data.get("data", "")
                if not audio_b64:
                    continue

                raw_samples = preprocessor.base64_pcm_to_float32(audio_b64)
                if len(raw_samples) == 0:
                    continue

                # Resample and convert to mono if needed
                if channels > 1:
                    raw_samples = preprocessor.to_mono(raw_samples, channels)
                if sample_rate != 16000:
                    raw_samples = preprocessor.resample(raw_samples, sample_rate)

                buffer.append(raw_samples)

                # If sufficient audio accumulated, run preprocessing & inference
                if buffer.has_sufficient_audio(min_duration_sec=1.5):
                    window = buffer.get_latest_window()
                    processed, rms, is_valid, msg = preprocessor.preprocess(window, orig_sr=16000, channels=1)

                    prediction = detector.predict(processed, sample_rate=16000)
                    
                    # 1. Fetch Session Metadata
                    from app.model.session_metadata_store import SessionMetadataStore
                    store = SessionMetadataStore.get_instance()
                    session_metadata = store.get_metadata(session_id)
                    
                    # 2. Run Contextual Risk Engine
                    from app.model.risk_engine import RiskEngine
                    risk_engine = RiskEngine.get_instance()
                    blended_risk, recommended_action = risk_engine.evaluate(
                        acoustic_ai_probability=prediction.aiRisk,
                        metadata=session_metadata
                    )
                    
                    # 3. Log to Privacy/Compliance Module (No audio saved)
                    from app.core.privacy_logger import PrivacyLogger
                    privacy_logger = PrivacyLogger.get_instance()
                    privacy_logger.log_inference(
                        session_id=session_id,
                        speaker_id=client_id,
                        acoustic_features={"rms": rms, "aiRisk": prediction.aiRisk, "inferenceTimeMs": prediction.inferenceTimeMs},
                        blended_risk_score=blended_risk,
                        recommended_action=recommended_action,
                        session_metadata=session_metadata
                    )

                    resp_dict = prediction.model_dump()
                    resp_dict["rms"] = round(rms, 4)
                    resp_dict["speaker_id"] = client_id
                    resp_dict["blended_risk_score"] = blended_risk
                    resp_dict["recommended_action"] = recommended_action
                    resp_dict["metadata_applied"] = bool(session_metadata)
                    
                    # Broadcast prediction to all clients in the session
                    await manager.broadcast(resp_dict, session_id)

            elif msg_type == "stop":
                buffer.clear()
                await websocket.send_text(json.dumps({
                    "type": "stopped"
                }))
                break

            elif msg_type == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))

    except WebSocketDisconnect:
        logger.info(f"WebSocket client {client_id} disconnected from session {session_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)
        try:
            await websocket.send_text(json.dumps({
                "type": "error",
                "code": "SERVER_ERROR",
                "message": str(e)
            }))
        except Exception:
            pass
    finally:
        manager.disconnect(websocket, session_id)
        buffer.clear()
