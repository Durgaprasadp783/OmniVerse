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
    SaveMessageRequestSchema,
    SessionChatResponseSchema,
)
from app.services.chat_service import context_aware_chat, get_session_history, save_message

router = APIRouter(prefix="/api/chat", tags=["Chat"])


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
    """
    Persist a user or assistant message for a chat session.

    Body:
        sessionId  – free-form session identifier (e.g. "test-session-1")
        role       – "user" | "assistant"
        message    – the message text
    """
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
    """
    Retrieve all messages in a chat session for the current user,
    ordered oldest-first (chronological).

    Returns an empty list if no messages have been saved yet.
    """
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
    """
    Full context-aware RAG pipeline in one call:
        1. Load the last 10 turns of conversation history
        2. Format history for the Gemini prompt
        3. Embed the user's question
        4. Vector-search user's documents (optionally scoped to fileId)
        5. Build history-aware prompt and call Gemini
        6. Persist user message + assistant answer to session_chats
        7. Return { answer, sessionId, sources }
    """
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
        )
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
    """
    POST /api/chat — the primary OmniVerse chat endpoint (Phase 5 Step 4).
    """
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
        )
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate response: {str(err)}",
        )

    return result
