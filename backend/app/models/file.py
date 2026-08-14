from datetime import datetime, timezone
from typing import Any, Dict, Optional
from bson import ObjectId


class FileModel:
    """Represents a File metadata document stored in MongoDB."""

    def __init__(
        self,
        user_id: str,
        filename: str,
        original_name: str,
        file_type: str,
        size: int,
        path: str,
        extracted_text: str = "",
        page_count: int = 0,
        word_count: int = 0,
        processed: bool = False,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
        _id: Optional[ObjectId] = None,
    ):
        self._id = _id or ObjectId()
        self.user_id = user_id
        self.filename = filename
        self.original_name = original_name
        self.file_type = file_type
        self.size = size
        self.path = path
        self.extracted_text = extracted_text
        self.page_count = page_count
        self.word_count = word_count
        self.processed = processed
        now = datetime.now(timezone.utc)
        self.created_at = created_at or now
        self.updated_at = updated_at or now

    def to_dict(self) -> Dict[str, Any]:
        return {
            "_id": self._id,
            "userId": self.user_id,
            "filename": self.filename,
            "originalName": self.original_name,
            "fileType": self.file_type,
            "size": self.size,
            "path": self.path,
            "extractedText": self.extracted_text,
            "pageCount": self.page_count,
            "wordCount": self.word_count,
            "processed": self.processed,
            "createdAt": self.created_at,
            "updatedAt": self.updated_at,
        }

