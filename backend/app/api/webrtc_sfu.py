import json
import logging
import asyncio
from typing import Dict, Optional, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from aiortc import RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, MediaStreamTrack
from aiortc.contrib.media import MediaRelay

from app.model.detector import VoiceGuardDetector
from app.audio.preprocessing import AudioPreprocessor
from app.audio.buffer import AudioStreamBuffer
import numpy as np

logger = logging.getLogger("voiceguard.sfu")
router = APIRouter()
relay = MediaRelay()

class AudioProcessorTrack(MediaStreamTrack):
    kind = "audio"

    def __init__(self, track: MediaStreamTrack, client_id: str, websocket: WebSocket):
        super().__init__()
        self.track = track
        self.client_id = client_id
        self.websocket = websocket
        self.detector = VoiceGuardDetector.get_instance()
        self.preprocessor = AudioPreprocessor()
        # WebRTC audio is usually 48kHz, 2 channels, or 16kHz 1 channel depending on negotiation
        self.buffer = AudioStreamBuffer(sample_rate=16000, window_duration_sec=5.0)

    async def recv(self):
        frame = await self.track.recv()
        
        try:
            # frame is an av.AudioFrame
            # convert to numpy array
            arr = frame.to_ndarray()
            
            # Resample and convert to mono if needed
            samples = arr[0] if arr.ndim > 1 else arr
            
            # This is a highly simplified processing step for POC.
            # In production, proper resampling from frame.sample_rate to 16000 is needed.
            if frame.sample_rate != 16000:
                # Basic decimation/interpolation for POC
                pass

            # Since the AI expects 16kHz float32
            float_samples = samples.astype(np.float32) / 32768.0
            self.buffer.append(float_samples)

            if self.buffer.has_sufficient_audio(min_duration_sec=1.5):
                window = self.buffer.get_latest_window()
                processed, rms, is_valid, msg = self.preprocessor.preprocess(window, orig_sr=16000, channels=1)
                
                prediction = self.detector.predict(processed, sample_rate=16000)
                resp_dict = prediction.model_dump()
                resp_dict["rms"] = round(rms, 4)
                resp_dict["type"] = "sfu:prediction"
                
                # Send the prediction back to the client via WebSocket!
                asyncio.ensure_future(self.websocket.send_text(json.dumps(resp_dict)))

        except Exception as e:
            logger.error(f"Audio processing error: {e}")

        return frame

class SFUClient:
    def __init__(self, client_id: str, websocket: WebSocket):
        self.client_id = client_id
        self.websocket = websocket
        self.pc: Optional[RTCPeerConnection] = None
        self.track: Optional[MediaStreamTrack] = None
        self.peer_client: Optional['SFUClient'] = None
        # Flags to prevent race conditions when both on_track and handle_offer
        # try to add tracks to the peer simultaneously
        self.track_added_to_peer: bool = False

    async def send_msg(self, msg: dict):
        try:
            await self.websocket.send_text(json.dumps(msg))
        except Exception as e:
            logger.error(f"Failed to send to {self.client_id}: {e}")

clients: Dict[str, SFUClient] = {}

async def handle_offer(client: SFUClient, offer_sdp: dict):
    pc = RTCPeerConnection()
    client.pc = pc

    @pc.on("iceconnectionstatechange")
    async def on_iceconnectionstatechange():
        logger.info(f"ICE state for {client.client_id}: {pc.iceConnectionState}")
        if pc.iceConnectionState == "failed":
            await pc.close()

    @pc.on("track")
    def on_track(track):
        logger.info(f"Track {track.kind} received from {client.client_id}")
        if track.kind == "audio":
            processor_track = AudioProcessorTrack(track, client.client_id, client.websocket)
            client.track = relay.subscribe(processor_track)
            
            # Only push track to peer if peer is already connected AND hasn't received our track yet
            if client.peer_client and client.peer_client.pc and not client.track_added_to_peer:
                client.track_added_to_peer = True
                asyncio.ensure_future(add_track_to_peer(client.peer_client, client.track))

    # We must add a transceiver so the client knows we can send and receive audio
    pc.addTransceiver("audio", direction="sendrecv")

    offer = RTCSessionDescription(sdp=offer_sdp["sdp"], type=offer_sdp["type"])
    await pc.setRemoteDescription(offer)

    answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    await client.send_msg({
        "type": "sfu:answer",
        "sdp": {"sdp": pc.localDescription.sdp, "type": pc.localDescription.type}
    })

    # If the peer already has a track ready and hasn't been added to us yet
    if client.peer_client and client.peer_client.track and not client.peer_client.track_added_to_peer:
        client.peer_client.track_added_to_peer = True
        asyncio.ensure_future(add_track_to_peer(client, client.peer_client.track))

async def add_track_to_peer(client: SFUClient, track: MediaStreamTrack):
    logger.info(f"Adding remote track to {client.client_id}")
    if not client.pc:
        return

    # Check if we already have a sender for this track kind to avoid InvalidAccessError
    existing_senders = [s for s in client.pc.getSenders() if s.track and s.track.kind == track.kind]
    if existing_senders:
        # Replace the existing track rather than adding a new one
        logger.info(f"Replacing existing {track.kind} sender for {client.client_id}")
        await existing_senders[0].replaceTrack(track)
        # No need to renegotiate for replaceTrack
        return

    try:
        client.pc.addTrack(track)
    except Exception as e:
        logger.warning(f"addTrack failed for {client.client_id}: {e}")
        return

    try:
        offer = await client.pc.createOffer()
        await client.pc.setLocalDescription(offer)
        await client.send_msg({
            "type": "sfu:renegotiate",
            "sdp": {"sdp": client.pc.localDescription.sdp, "type": client.pc.localDescription.type}
        })
    except Exception as e:
        logger.error(f"Renegotiation failed for {client.client_id}: {e}")

@router.websocket("/ws/sfu/{client_id}")
async def websocket_sfu(websocket: WebSocket, client_id: str):
    await websocket.accept()
    client = SFUClient(client_id, websocket)
    clients[client_id] = client
    logger.info(f"SFU Client connected: {client_id}")

    try:
        while True:
            raw_msg = await websocket.receive_text()
            data = json.loads(raw_msg)
            msg_type = data.get("type")

            if msg_type == "sfu:dial":
                target_id = data.get("target")
                target_client = clients.get(target_id)
                if target_client:
                    client.peer_client = target_client
                    target_client.peer_client = client
                    await target_client.send_msg({
                        "type": "sfu:incoming",
                        "caller": client_id
                    })
                else:
                    await client.send_msg({"type": "sfu:error", "message": "Target not found"})
                    
            elif msg_type == "sfu:accept":
                caller_id = data.get("caller")
                caller_client = clients.get(caller_id)
                if caller_client:
                    await caller_client.send_msg({"type": "sfu:accepted"})
                    await client.send_msg({"type": "sfu:accepted"})

            elif msg_type == "sfu:offer":
                await handle_offer(client, data.get("sdp"))

            elif msg_type == "sfu:answer":
                # Received answer for a renegotiation
                sdp = data.get("sdp")
                if client.pc:
                    answer = RTCSessionDescription(sdp=sdp["sdp"], type=sdp["type"])
                    await client.pc.setRemoteDescription(answer)

            elif msg_type == "sfu:reject" or msg_type == "sfu:end":
                if client.peer_client:
                    await client.peer_client.send_msg({"type": "sfu:ended"})
                    if client.peer_client.pc:
                        await client.peer_client.pc.close()
                    client.peer_client.peer_client = None
                    client.peer_client.track_added_to_peer = False
                    client.peer_client = None
                client.track_added_to_peer = False
                client.track = None
                if client.pc:
                    await client.pc.close()
                    client.pc = None

    except WebSocketDisconnect:
        logger.info(f"SFU Client disconnected: {client_id}")
    except Exception as e:
        logger.error(f"SFU Error: {e}", exc_info=True)
    finally:
        if client.peer_client:
            asyncio.create_task(client.peer_client.send_msg({"type": "sfu:ended"}))
            if client.peer_client.pc:
                asyncio.create_task(client.peer_client.pc.close())
            client.peer_client.peer_client = None
        if client.pc:
            asyncio.create_task(client.pc.close())
        if client_id in clients:
            del clients[client_id]
