from datetime import datetime, timezone
from typing import Any, Dict, Optional
from bson import ObjectId


class UserModel:
    """Represents a User document in MongoDB."""

    def __init__(
        self,
        name: str,
        email: str,
        password: str,
        is_active: bool = True,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
        _id: Optional[ObjectId] = None,
    ):
        self._id = _id or ObjectId()
        self.name = name
        self.email = email
        self.password = password
        self.is_active = is_active
        now = datetime.now(timezone.utc)
        self.created_at = created_at or now
        self.updated_at = updated_at or now

    def to_dict(self) -> Dict[str, Any]:
        return {
            "_id": self._id,
            "name": self.name,
            "email": self.email,
            "password": self.password,
            "is_active": self.is_active,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }
