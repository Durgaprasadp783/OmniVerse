import os
import random
import time
from datetime import datetime, timezone
from typing import List, Optional
from bson import ObjectId
from fastapi import HTTPException, UploadFile, status

from app.config.database import files_collection
from app.models.file import FileModel

ALLOWED_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "image/png",
    "image/jpeg",
    "image/jpg",
}

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")


def format_file_doc(doc: dict) -> dict:
    """Format MongoDB document into a clean API response dict."""
    return {
        "id": str(doc["_id"]),
        "_id": str(doc["_id"]),
        "userId": str(doc.get("userId")),
        "filename": doc.get("filename"),
        "originalName": doc.get("originalName"),
        "fileType": doc.get("fileType"),
        "size": doc.get("size"),
        "path": doc.get("path"),
        "createdAt": doc.get("createdAt"),
        "updatedAt": doc.get("updatedAt"),
    }


class FileService:

    @staticmethod
    async def upload_file(user_id: str, upload_file: UploadFile) -> dict:
        """
        Validate, save file to disk in uploads/, and record metadata in MongoDB.
        """
        # Validate MIME type
        if upload_file.content_type not in ALLOWED_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported File Type",
            )

        # Read file contents to verify size
        content = await upload_file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File size exceeds maximum limit of 20MB",
            )

        # Ensure upload directory exists
        os.makedirs(UPLOAD_DIR, exist_ok=True)

        original_filename = upload_file.filename or "unnamed_file"
        timestamp = int(time.time() * 1000)
        ext = os.path.splitext(original_filename)[1]
        random_suffix = random.randint(100000000, 999999999)
        unique_filename = f"{timestamp}-{random_suffix}{ext}"
        file_path = os.path.join("uploads", unique_filename)
        abs_file_path = os.path.join(UPLOAD_DIR, unique_filename)

        # Save file to disk
        with open(abs_file_path, "wb") as out_file:
            out_file.write(content)

        # Create record in DB
        file_model = FileModel(
            user_id=user_id,
            filename=unique_filename,
            original_name=original_filename,
            file_type=upload_file.content_type or "application/octet-stream",
            size=len(content),
            path=file_path.replace("\\", "/"),
        )

        doc = file_model.to_dict()
        result = await files_collection.insert_one(doc)
        inserted_doc = await files_collection.find_one({"_id": result.inserted_id})

        return format_file_doc(inserted_doc)

    @staticmethod
    async def get_user_files(user_id: str) -> List[dict]:
        """Fetch all files uploaded by the user."""
        cursor = files_collection.find({"userId": user_id}).sort("createdAt", -1)
        docs = await cursor.to_list(length=500)
        return [format_file_doc(d) for d in docs]

    @staticmethod
    async def delete_user_file(user_id: str, file_id: str) -> bool:
        """Delete file record and physical file from disk."""
        try:
            obj_id = ObjectId(file_id)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file ID format",
            )

        file_doc = await files_collection.find_one({"_id": obj_id, "userId": user_id})
        if not file_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found or unauthorized",
            )

        # Remove physical file if present
        rel_path = file_doc.get("path", "")
        if rel_path:
            abs_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(__file__))), rel_path
            )
            if os.path.exists(abs_path):
                try:
                    os.remove(abs_path)
                except OSError:
                    pass

        await files_collection.delete_one({"_id": obj_id})
        return True
