import json
import logging
from typing import Dict
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger("voiceguard.signaling")
router = APIRouter()

# In-memory store of connected clients
# Mapping: client_id -> WebSocket
connected_clients: Dict[str, WebSocket] = {}

@router.websocket("/ws/signaling/{client_id}")
async def websocket_signaling(websocket: WebSocket, client_id: str):
    await websocket.accept()
    
    # Store the connection
    connected_clients[client_id] = websocket
    logger.info(f"Signaling client connected: {client_id}")

    try:
        while True:
            raw_msg = await websocket.receive_text()
            try:
                data = json.loads(raw_msg)
            except Exception:
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": "Payload must be valid JSON"
                }))
                continue

            msg_type = data.get("type", "")
            target_id = data.get("target")

            # Route messages between peers
            if msg_type in ["call:offer", "call:answer", "call:ice-candidate", "call:end", "call:reject"]:
                if not target_id:
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": "Target ID is required for routing"
                    }))
                    continue

                if target_id in connected_clients:
                    target_ws = connected_clients[target_id]
                    # Forward the exact message to the target, ensuring sender ID is injected
                    data["sender"] = client_id
                    try:
                        await target_ws.send_text(json.dumps(data))
                    except Exception as e:
                        logger.error(f"Failed to route message to {target_id}: {e}")
                else:
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": f"Target {target_id} is not connected"
                    }))
                    
            elif msg_type == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))

    except WebSocketDisconnect:
        logger.info(f"Signaling client disconnected: {client_id}")
    except Exception as e:
        logger.error(f"Signaling WebSocket error for {client_id}: {e}", exc_info=True)
    finally:
        if client_id in connected_clients:
            del connected_clients[client_id]
