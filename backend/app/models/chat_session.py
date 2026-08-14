from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from bson import ObjectId


class ChatSessionModel:
    """Represents a named Chat Session belonging to a user."""

    def __init__(
        self,
        user_id: str,
        title: str = "New Chat",
        session_id: Optional[str] = None,
        file_ids: Optional[List[str]] = None,
        last_message: str = "",
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
        _id: Optional[ObjectId] = None,
    ):
        self._id = _id or ObjectId()
        self.user_id = user_id
        self.session_id = session_id or str(self._id)
        self.title = title
        self.file_ids = file_ids or []
        self.last_message = last_message
        now = datetime.now(timezone.utc)
        self.created_at = created_at or now
        self.updated_at = updated_at or now

    def to_dict(self) -> Dict[str, Any]:
        return {
            "_id": self._id,
            "userId": self.user_id,
            "sessionId": self.session_id,
            "title": self.title,
            "fileIds": self.file_ids,
            "lastMessage": self.last_message,
            "createdAt": self.created_at,
            "updatedAt": self.updated_at,
        }
