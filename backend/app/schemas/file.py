from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class FileResponseSchema(BaseModel):
    id: str = Field(..., description="Document ID in MongoDB")
    _id: Optional[str] = None
    userId: str
    filename: str
    originalName: str
    fileType: str
    size: int
    path: str
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class FileUploadSuccessSchema(BaseModel):
    success: bool = True
    message: str = "File uploaded successfully"
    file: FileResponseSchema

