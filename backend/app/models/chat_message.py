from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from bson import ObjectId


class ChatMessageModel:
    """Represents a chat message in a document RAG conversation thread."""

    def __init__(
        self,
        user_id: str,
        file_id: str,
        role: str,
        content: str,
        sources: Optional[List[Dict[str, Any]]] = None,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
        _id: Optional[ObjectId] = None,
    ):
        self._id = _id or ObjectId()
        self.user_id = user_id
        self.file_id = file_id
        self.role = role  # "user" or "assistant"
        self.content = content
        self.sources = sources if sources is not None else []
        now = datetime.now(timezone.utc)
        self.created_at = created_at or now
        self.updated_at = updated_at or now

    def to_dict(self) -> Dict[str, Any]:
        file_id_val = (
            ObjectId(self.file_id)
            if isinstance(self.file_id, str) and ObjectId.is_valid(self.file_id)
            else self.file_id
        )
        user_id_val = (
            ObjectId(self.user_id)
            if isinstance(self.user_id, str) and ObjectId.is_valid(self.user_id)
            else self.user_id
        )
        return {
            "_id": self._id,
            "userId": user_id_val,
            "fileId": file_id_val,
            "role": self.role,
            "content": self.content,
            "sources": self.sources,
            "createdAt": self.created_at,
            "updatedAt": self.updated_at,
        }

    @classmethod
    def from_mongo(cls, doc: Dict[str, Any]) -> "ChatMessageModel":
        return cls(
            _id=doc.get("_id"),
            user_id=str(doc.get("userId")),
            file_id=str(doc.get("fileId")),
            role=doc.get("role", "user"),
            content=doc.get("content", ""),
            sources=doc.get("sources", []),
            created_at=doc.get("createdAt"),
            updated_at=doc.get("updatedAt"),
        )


class SessionChatModel:
    """
    Represents a single message in a session-based chat history.

    Unlike ChatMessageModel (which is file-scoped), this model
    uses a free-form `sessionId` string — equivalent to the
    tutorial's Chat.js Mongoose schema — so conversations can
    span multiple documents or exist independently.
    """

    def __init__(
        self,
        user_id: str,
        session_id: str,
        role: str,            # "user" | "assistant"
        message: str,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
        _id: Optional[ObjectId] = None,
    ):
        self._id = _id or ObjectId()
        self.user_id = user_id
        self.session_id = session_id
        self.role = role
        self.message = message
        now = datetime.now(timezone.utc)
        self.created_at = created_at or now
        self.updated_at = updated_at or now

    def to_dict(self) -> Dict[str, Any]:
        user_id_val = (
            ObjectId(self.user_id)
            if isinstance(self.user_id, str) and ObjectId.is_valid(self.user_id)
            else self.user_id
        )
        return {
            "_id": self._id,
            "userId": user_id_val,
            "sessionId": self.session_id,
            "role": self.role,
            "message": self.message,
            "createdAt": self.created_at,
            "updatedAt": self.updated_at,
        }

    @classmethod
    def from_mongo(cls, doc: Dict[str, Any]) -> "SessionChatModel":
        return cls(
            _id=doc.get("_id"),
            user_id=str(doc.get("userId", "")),
            session_id=doc.get("sessionId", ""),
            role=doc.get("role", "user"),
            message=doc.get("message", ""),
            created_at=doc.get("createdAt"),
            updated_at=doc.get("updatedAt"),
        )

