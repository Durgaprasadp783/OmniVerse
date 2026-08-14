from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.auth.dependencies import get_current_user
from app.auth.rate_limiter import chat_limiter
from app.services.study_service import generate_study_content

router = APIRouter(prefix="/api/study", tags=["Study Mode"])


class StudyGenerateRequestSchema(BaseModel):
    mode: str = Field(..., description="Study mode: explain | summarize | topics | questions | mcqs | flashcards | examprep")
    fileIds: Optional[List[str]] = Field(default=None, description="Selected file IDs")
    topic: Optional[str] = Field(default=None, max_length=200, description="Optional focus topic")


class StudyGenerateResponseSchema(BaseModel):
    success: bool = True
    mode: str
    content: str
    structuredData: Optional[dict] = None


@router.post(
    "/generate",
    response_model=StudyGenerateResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="Generate AI Study Mode grounded content",
    dependencies=[Depends(chat_limiter)],
)
async def generate_study(
    payload: StudyGenerateRequestSchema,
    current_user: dict = Depends(get_current_user),
):
    """
    Generate grounded AI study materials based on uploaded documents.
    """
    user_id = str(current_user["_id"])
    try:
        res = await generate_study_content(
            user_id=user_id,
            mode=payload.mode,
            file_ids=payload.fileIds,
            topic=payload.topic,
        )
        return {
            "success": True,
            "mode": res["mode"],
            "content": res["content"],
            "structuredData": res.get("structuredData"),
        }
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Study content generation failed: {str(err)}",
        )
