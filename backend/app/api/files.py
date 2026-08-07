from typing import List
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.auth.dependencies import get_current_user
from app.schemas.file import FileResponseSchema, FileUploadSuccessSchema
from app.services.file_service import FileService

router = APIRouter(prefix="/api/files", tags=["Files"])


@router.post(
    "/upload",
    response_model=FileUploadSuccessSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a document or image file",
)
async def upload_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Upload a document (PDF, DOCX, PPTX, PNG, JPEG) up to 20MB.
    Protected by JWT Bearer authentication.
    """
    user_id = str(current_user["_id"])
    uploaded_file = await FileService.upload_file(user_id=user_id, upload_file=file)
    return {
        "success": True,
        "message": "File uploaded successfully",
        "file": uploaded_file,
    }


@router.get(
    "",
    response_model=List[FileResponseSchema],
    status_code=status.HTTP_200_OK,
    summary="Get all files uploaded by current user",
)
async def get_user_files(
    current_user: dict = Depends(get_current_user),
):
    """Fetch list of all documents uploaded by authenticated user."""
    user_id = str(current_user["_id"])
    return await FileService.get_user_files(user_id=user_id)


@router.delete(
    "/{file_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a file by ID",
)
async def delete_file(
    file_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete a user's uploaded file from disk and database."""
    user_id = str(current_user["_id"])
    await FileService.delete_user_file(user_id=user_id, file_id=file_id)
    return {"message": "File deleted successfully"}
