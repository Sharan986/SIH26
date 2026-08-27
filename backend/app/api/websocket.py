import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.audio.preprocessing import AudioPreprocessor
from app.audio.buffer import AudioStreamBuffer
from app.model.detector import VoiceGuardDetector

logger = logging.getLogger("voiceguard.ws")
router = APIRouter()

@router.websocket("/ws/analyze")
async def websocket_analyze_stream(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket client connected to /ws/analyze")

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
                    resp_dict = prediction.model_dump()
                    resp_dict["rms"] = round(rms, 4)
                    await websocket.send_text(json.dumps(resp_dict))

            elif msg_type == "stop":
                buffer.clear()
                await websocket.send_text(json.dumps({
                    "type": "stopped"
                }))
                break

            elif msg_type == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
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
        buffer.clear()
