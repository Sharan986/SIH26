from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from app.model.session_metadata_store import SessionMetadataStore

router = APIRouter()
store = SessionMetadataStore.get_instance()

class SessionMetadataPayload(BaseModel):
    transaction_value: Optional[float] = Field(None, description="Value of the ongoing transaction in INR")
    caller_reputation_score: Optional[int] = Field(None, description="Historical reputation score (0-100)")
    is_known_contact: Optional[bool] = Field(None, description="Is the caller in the user's trusted contacts list?")
    historical_fraud_flags: Optional[int] = Field(None, description="Number of past fraud flags associated with this caller ID")
    call_type: Optional[str] = Field(None, description="Type of call: e.g., 'customer_support', 'peer_to_peer', 'high_value_auth'")
    additional_context: Optional[Dict[str, Any]] = Field(default_factory=dict)

@router.post("/api/sessions/{session_id}/metadata")
async def update_session_metadata(session_id: str, payload: SessionMetadataPayload):
    """
    Inject contextual metadata into an active call session.
    This metadata is used by the Risk Engine to compute a dynamic blended risk score.
    """
    metadata_dict = payload.model_dump(exclude_unset=True)
    store.set_metadata(session_id, metadata_dict)
    
    return {
        "status": "success",
        "session_id": session_id,
        "updated_fields": list(metadata_dict.keys())
    }

@router.get("/api/sessions/{session_id}/metadata")
async def get_session_metadata(session_id: str):
    """Retrieve the current metadata for a session."""
    metadata = store.get_metadata(session_id)
    return {
        "session_id": session_id,
        "metadata": metadata
    }
