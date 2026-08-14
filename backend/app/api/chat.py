"""
POST /api/chat                  — ✅ PRIMARY: context-aware RAG (history + vector search + Gemini)
POST /api/chat/ask              — alias for POST /api/chat
POST /api/chat/message          — save a single chat turn manually
GET  /api/chat/history/{sessionId} — retrieve ordered session history

Direct Python/FastAPI equivalent of the tutorial's chatRoutes.js +
chatController.js for OmniVerse (Phase 5 Step 4).
"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.dependencies import get_current_user
from app.auth.rate_limiter import chat_limiter
from app.schemas.chat import (
    AskRequestSchema,
    AskResponseSchema,
    ChatSessionResponseSchema,
    CreateSessionRequestSchema,
    RenameSessionRequestSchema,
    SaveMessageRequestSchema,
    SessionChatResponseSchema,
)
from app.services.chat_service import (
    context_aware_chat,
    delete_chat_session,
    get_session_history,
    get_user_chat_sessions,
    rename_chat_session,
    save_message,
    touch_chat_session,
)

router = APIRouter(prefix="/api/chat", tags=["Chat"])


@router.get(
    "/sessions",
    response_model=List[ChatSessionResponseSchema],
    status_code=status.HTTP_200_OK,
    summary="Get all chat sessions for user",
)
async def get_sessions(
    current_user: dict = Depends(get_current_user),
):
    """Retrieve list of user's saved chat sessions ordered by latest updated."""
    user_id = str(current_user["_id"])
    return await get_user_chat_sessions(user_id=user_id)


@router.post(
    "/sessions",
    response_model=ChatSessionResponseSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new chat session",
)
async def create_session(
    payload: CreateSessionRequestSchema,
    current_user: dict = Depends(get_current_user),
):
    """Create a new named chat session."""
    import uuid
    user_id = str(current_user["_id"])
    new_session_id = f"session-{uuid.uuid4()}"
    return await touch_chat_session(
        user_id=user_id,
        session_id=new_session_id,
        title=payload.title or "New Chat",
        file_ids=payload.fileIds or [],
    )


@router.patch(
    "/sessions/{session_id}",
    response_model=ChatSessionResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="Rename a chat session",
)
async def rename_session(
    session_id: str,
    payload: RenameSessionRequestSchema,
    current_user: dict = Depends(get_current_user),
):
    """Rename an existing chat session."""
    user_id = str(current_user["_id"])
    return await rename_chat_session(user_id=user_id, session_id=session_id, new_title=payload.title)


@router.delete(
    "/sessions/{session_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a chat session and its history",
)
async def delete_session(
    session_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete a chat session and all messages within it."""
    user_id = str(current_user["_id"])
    await delete_chat_session(user_id=user_id, session_id=session_id)
    return {"message": "Chat session deleted successfully"}


@router.post(
    "/message",
    response_model=SessionChatResponseSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Save a chat message to session history",
    dependencies=[Depends(chat_limiter)],
)
async def post_message(
    payload: SaveMessageRequestSchema,
    current_user: dict = Depends(get_current_user),
):
    if not payload.sessionId.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="sessionId must not be empty",
        )
    if not payload.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="message must not be empty",
        )
    if len(payload.message) > 5000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message is too long",
        )

    user_id = str(current_user["_id"])
    saved = await save_message(
        user_id=user_id,
        session_id=payload.sessionId,
        role=payload.role,
        message=payload.message,
    )
    return saved


@router.get(
    "/history/{session_id}",
    response_model=List[SessionChatResponseSchema],
    status_code=status.HTTP_200_OK,
    summary="Get chat history for a session",
)
async def get_history(
    session_id: str,
    current_user: dict = Depends(get_current_user),
):
    user_id = str(current_user["_id"])
    history = await get_session_history(user_id=user_id, session_id=session_id)
    return history


@router.post(
    "/ask",
    response_model=AskResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="Context-aware RAG chat (history + vector search + Gemini)",
    dependencies=[Depends(chat_limiter)],
)
async def ask(
    payload: AskRequestSchema,
    current_user: dict = Depends(get_current_user),
):
    if not payload.sessionId.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="sessionId must not be empty",
        )
    if not payload.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="message must not be empty",
        )
    if len(payload.message) > 5000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message is too long",
        )

    user_id = str(current_user["_id"])

    try:
        result = await context_aware_chat(
            user_id=user_id,
            session_id=payload.sessionId,
            message=payload.message,
            file_id=payload.fileId,
            file_ids=payload.fileIds,
        )
    except HTTPException:
        raise
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"RAG error: {str(err)}",
        )

    return result


@router.post(
    "",
    response_model=AskResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="[PRIMARY] Context-aware RAG chat — the consolidated Step 4 endpoint",
    dependencies=[Depends(chat_limiter)],
)
async def chat(
    payload: AskRequestSchema,
    current_user: dict = Depends(get_current_user),
):
    if not payload.sessionId.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="sessionId is required",
        )
    if not payload.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message is required",
        )
    if len(payload.message) > 5000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message is too long",
        )

    user_id = str(current_user["_id"])

    try:
        result = await context_aware_chat(
            user_id=user_id,
            session_id=payload.sessionId,
            message=payload.message,
            file_id=payload.fileId,
            file_ids=payload.fileIds,
        )
    except HTTPException:
        raise
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate response: {str(err)}",
        )

    return result

