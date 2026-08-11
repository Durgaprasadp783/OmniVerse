from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from bson import ObjectId


class ChunkModel:
    """Represents a text chunk extracted from a document for RAG indexing."""

    def __init__(
        self,
        file_id: str,
        user_id: str,
        chunk_index: int,
        text: str,
        embedding: Optional[List[float]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
        _id: Optional[ObjectId] = None,
    ):
        self._id = _id or ObjectId()
        self.file_id = file_id
        self.user_id = user_id
        self.chunk_index = chunk_index
        self.text = text
        self.embedding = embedding if embedding is not None else []
        self.metadata = metadata if metadata is not None else {"page": None}
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
            "fileId": file_id_val,
            "userId": user_id_val,
            "chunkIndex": self.chunk_index,
            "text": self.text,
            "embedding": self.embedding,
            "metadata": self.metadata,
            "createdAt": self.created_at,
            "updatedAt": self.updated_at,
        }

