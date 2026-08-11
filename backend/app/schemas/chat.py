from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


# ── Request schemas ───────────────────────────────────────────────────────────

class SaveMessageRequestSchema(BaseModel):
    """Body for POST /api/chat/message — save a single chat turn."""
    sessionId: str = Field(..., min_length=1, max_length=200, description="Free-form session identifier")
    role: Literal["user", "assistant"] = Field(..., description="Who sent this message")
    message: str = Field(..., min_length=1, max_length=5000, description="The message text (max 5000 chars)")


class AskRequestSchema(BaseModel):
    """Body for POST /api/chat/ask — context-aware RAG chat."""
    sessionId: str = Field(..., min_length=1, max_length=200, description="Conversation session identifier")
    message: str = Field(..., min_length=1, max_length=5000, description="The user's current question (max 5000 chars)")
    fileId: Optional[str] = Field(
        None,
        description="Optional: restrict vector search to a specific document",
    )


# ── Response schemas ──────────────────────────────────────────────────────────

class SessionChatResponseSchema(BaseModel):
    """A single saved chat message returned by the API."""
    id: str = Field(..., description="MongoDB document ID")
    userId: str
    sessionId: str
    role: str
    message: str
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None


class AskSourceSchema(BaseModel):
    """Source provenance for a retrieved chunk used in the answer."""
    source: int
    filename: Optional[str] = None
    page: Optional[int] = None
    fileId: Optional[str] = None
    chunkIndex: Optional[int] = None
    similarity: Optional[float] = None


class AskResponseSchema(BaseModel):
    """Response for POST /api/chat/ask."""
    answer: str
    sessionId: str
    sources: List[AskSourceSchema] = []
