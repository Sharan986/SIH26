from typing import Dict, Any, Optional
import threading

class SessionMetadataStore:
    """
    In-memory store for session metadata.
    In a production enterprise scenario, this would be backed by Redis.
    """
    _instance = None
    _lock = threading.Lock()

    def __init__(self):
        self.sessions: Dict[str, Dict[str, Any]] = {}

    @classmethod
    def get_instance(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = SessionMetadataStore()
            return cls._instance

    def set_metadata(self, session_id: str, metadata: Dict[str, Any]):
        if session_id not in self.sessions:
            self.sessions[session_id] = {}
        self.sessions[session_id].update(metadata)

    def get_metadata(self, session_id: str) -> Dict[str, Any]:
        return self.sessions.get(session_id, {})

    def clear_session(self, session_id: str):
        if session_id in self.sessions:
            del self.sessions[session_id]
