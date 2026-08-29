import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.model.detector import VoiceGuardDetector
from app.api import health, analyze, websocket, signaling, session_metadata

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("voiceguard.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting VoiceGuard AI Service...")
    detector = VoiceGuardDetector.get_instance()
    detector.load_model()
    yield
    logger.info("Shutting down VoiceGuard AI Service...")

app = FastAPI(
    title="VoiceGuard AI Authenticity API",
    description="Real-time voice authenticity detection and risk estimation for cellular calls.",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["Health"])
app.include_router(analyze.router, tags=["Analysis"])
app.include_router(websocket.router, tags=["WebSocket"])
app.include_router(signaling.router, tags=["WebRTC Signaling"])
app.include_router(session_metadata.router, tags=["Session Metadata"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
