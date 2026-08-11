from typing import List
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.auth.dependencies import get_current_user
from app.schemas.file import (
    ChatFileRequestSchema,
    ChatFileResponseSchema,
    ChatMessageSchema,
    ChunkFileResponseSchema,
    EmbedFileResponseSchema,
    FileResponseSchema,
    FileUploadSuccessSchema,
    ProcessFileResponseSchema,
    SearchFileRequestSchema,
    SearchFileResponseSchema,
)
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


@router.get(
    "/{file_id}",
    response_model=FileResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="Get single document details by ID",
)
async def get_file_by_id(
    file_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Fetch metadata for a single document by ID belonging to the user."""
    user_id = str(current_user["_id"])
    return await FileService.get_user_file_by_id(user_id=user_id, file_id=file_id)



@router.post(
    "/{file_id}/process",
    response_model=ProcessFileResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="Process PDF file and extract text",
)
async def process_file(
    file_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Extract text and page count from a PDF file."""
    user_id = str(current_user["_id"])
    return await FileService.process_file(user_id=user_id, file_id=file_id)


@router.post(
    "/{file_id}/chunk",
    response_model=ChunkFileResponseSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Split processed document text into chunks",
)
async def chunk_file(
    file_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Split processed document text into indexed chunks."""
    user_id = str(current_user["_id"])
    return await FileService.chunk_file(user_id=user_id, file_id=file_id)


@router.post(
    "/{file_id}/embed",
    response_model=EmbedFileResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="Generate vector embeddings for document chunks",
)
async def embed_file(
    file_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Generate vector embeddings for document chunks using Gemini Embedding API."""
    user_id = str(current_user["_id"])
    return await FileService.embed_file(user_id=user_id, file_id=file_id)


@router.post(
    "/{file_id}/search",
    response_model=SearchFileResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="Semantic vector search over document chunks",
)
async def search_file(
    file_id: str,
    payload: SearchFileRequestSchema,
    current_user: dict = Depends(get_current_user),
):
    """Search document chunks by semantic vector similarity."""
    user_id = str(current_user["_id"])
    return await FileService.search_file(
        user_id=user_id,
        file_id=file_id,
        query=payload.query,
        top_k=payload.topK or 5,
    )


@router.post(
    "/{file_id}/chat",
    response_model=ChatFileResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="RAG chat assistant against document context",
)
async def chat_with_file(
    file_id: str,
    payload: ChatFileRequestSchema,
    current_user: dict = Depends(get_current_user),
):
    """RAG chat endpoint answering user questions using retrieved document context."""
    user_id = str(current_user["_id"])
    return await FileService.chat_with_file(
        user_id=user_id,
        file_id=file_id,
        query=payload.query,
        top_k=payload.topK or 5,
    )


@router.get(
    "/{file_id}/chat/history",
    response_model=List[ChatMessageSchema],
    status_code=status.HTTP_200_OK,
    summary="Get chat history thread for a document",
)
async def get_chat_history(
    file_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Retrieve all past chat messages for a specific document and user."""
    user_id = str(current_user["_id"])
    return await FileService.get_chat_history(user_id=user_id, file_id=file_id)


@router.delete(
    "/{file_id}/chat/history",
    status_code=status.HTTP_200_OK,
    summary="Clear chat history for a document",
)
async def clear_chat_history(
    file_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Clear chat history for a document."""
    user_id = str(current_user["_id"])
    await FileService.clear_chat_history(user_id=user_id, file_id=file_id)
    return {"message": "Chat history cleared"}



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





