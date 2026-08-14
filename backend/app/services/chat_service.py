from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from bson import ObjectId

from app.config.database import session_chats_collection
from app.models.chat_message import SessionChatModel
from app.services.embedding_service import generate_embedding

# Maximum history turns sent to Gemini (keeps prompt size reasonable)
MAX_HISTORY_TURNS = 10


async def save_message(
    user_id: str,
    session_id: str,
    role: str,
    message: str,
) -> Dict[str, Any]:
    """
    Persist a single chat turn (user or assistant) to the session_chats
    collection and return a serialisable dict.

    Equivalent to Chat.create({ userId, sessionId, role, message }) in
    the tutorial's chatController.js.
    """
    doc = SessionChatModel(
        user_id=user_id,
        session_id=session_id,
        role=role,
        message=message,
    )
    await session_chats_collection.insert_one(doc.to_dict())

    # Reload so we get the exact MongoDB-persisted document
    saved = await session_chats_collection.find_one({"_id": doc._id})
    return _format(saved)


async def get_session_history(
    user_id: str,
    session_id: str,
) -> List[Dict[str, Any]]:
    """
    Fetch all messages for a session belonging to this user, ordered
    oldest-first — equivalent to Chat.find({ userId, sessionId })
    .sort({ createdAt: 1 }) in the tutorial.
    """
    user_obj_id = ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id
    cursor = session_chats_collection.find(
        {
            "userId": {"$in": [user_id, user_obj_id]},
            "sessionId": session_id,
        }
    ).sort("createdAt", 1)

    docs = await cursor.to_list(length=1000)
    return [_format(d) for d in docs]


async def get_conversation_history(
    user_id: str,
    session_id: str,
    limit: int = MAX_HISTORY_TURNS,
) -> List[Dict[str, Any]]:
    """
    Fetch the latest `limit` turns for a session — the slice sent to Gemini.

    Equivalent to Chat.find({ userId, sessionId }).sort({ createdAt: 1 }).limit(10)
    in the tutorial's getConversationHistory().

    We sort ascending after slicing so the result is always chronological.
    """
    user_obj_id = ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id
    # Sort descending to grab the *latest* N, then reverse for chronological order
    cursor = session_chats_collection.find(
        {
            "userId": {"$in": [user_id, user_obj_id]},
            "sessionId": session_id,
        }
    ).sort("createdAt", -1).limit(limit)

    docs = await cursor.to_list(length=limit)
    docs.reverse()   # chronological order for the prompt
    return [_format(d) for d in docs]


def format_history(chats: List[Dict[str, Any]]) -> str:
    """
    Convert a list of chat turns into a single multi-line string.

    Example output:
        user: Explain machine learning.
        assistant: Machine learning is a branch of AI...
        user: What are its applications?

    Equivalent to formatHistory() in the tutorial's chatController.js.
    """
    return "\n".join(
        f"{chat['role']}: {chat['message']}"
        for chat in chats
    )


async def context_aware_chat(
    user_id: str,
    session_id: str,
    message: str,
    file_id: Optional[str] = None,
    file_ids: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Full context-aware RAG pipeline supporting single/multi-document search:

        1. Fetch the last MAX_HISTORY_TURNS turns from this session
        2. Format them into a history string
        3. Embed the user's current question
        4. Vector-search user's documents (scoped to single file_id or list of file_ids)
        5. Rerank candidates and build context-aware prompt for Gemini
        6. Save user message + assistant answer
        7. Return { answer, sessionId, sources }
    """
    from app.services.rag_service import generate_context_aware_answer
    from app.services.vector_search_service import search_similar_chunks

    # ── 1. Get conversation history (last N turns) ────────────────────────────
    prior_turns = await get_conversation_history(user_id=user_id, session_id=session_id)

    # ── 2. Format history for the prompt ─────────────────────────────────────
    history_str = format_history(prior_turns)

    # ── 3. Embed the current question ─────────────────────────────────────────
    query_embedding = generate_embedding(message)

    # ── 4. Combine file_id and file_ids list ──────────────────────────────────
    target_file_ids: List[str] = []
    if file_ids:
        target_file_ids.extend(file_ids)
    if file_id and file_id not in target_file_ids:
        target_file_ids.append(file_id)

    filename: Optional[str] = None
    if target_file_ids:
        from app.config.database import files_collection
        from fastapi import HTTPException, status
        user_obj_id = ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id

        for fid in target_file_ids:
            try:
                file_obj_id = ObjectId(fid) if ObjectId.is_valid(fid) else fid
                f = await files_collection.find_one({
                    "_id": file_obj_id,
                    "userId": {"$in": [user_id, user_obj_id]},
                })
                if not f:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Document not found",
                    )
                if len(target_file_ids) == 1:
                    filename = f.get("originalName")
            except HTTPException:
                raise
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Document not found",
                )

    retrieved_chunks = await search_similar_chunks(
        user_id=user_id,
        query_embedding=query_embedding,
        file_id=file_id if not target_file_ids else None,
        file_ids=target_file_ids if target_file_ids else None,
        filename=filename,
        query_text=message,
    )

    # ── 5. Generate context-aware answer ─────────────────────────────────────
    rag_result = generate_context_aware_answer(
        question=message,
        chunks=retrieved_chunks,
        history=history_str,
    )
    answer = rag_result["answer"]
    sources = rag_result["sources"]

    # ── 6. Save user message ──────────────────────────────────────────────────
    await save_message(
        user_id=user_id,
        session_id=session_id,
        role="user",
        message=message,
    )

    # ── 7. Save assistant answer ──────────────────────────────────────────────
    await save_message(
        user_id=user_id,
        session_id=session_id,
        role="assistant",
        message=answer,
    )

    # Update session metadata if chat_session exists or auto-create it (safe non-blocking)
    try:
        await touch_chat_session(user_id, session_id, last_message=answer, file_ids=target_file_ids)
    except Exception as err:
        print(f"Notice: touch_chat_session: {err}")

    # ── 8. Return structured response ─────────────────────────────────────────
    return {
        "answer": answer,
        "sessionId": session_id,
        "sources": sources,
    }


async def touch_chat_session(
    user_id: str,
    session_id: str,
    title: Optional[str] = None,
    last_message: str = "",
    file_ids: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Create or update session record in chat_sessions_collection."""
    from app.config.database import chat_sessions_collection
    from app.models.chat_session import ChatSessionModel

    user_obj_id = ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id
    existing = await chat_sessions_collection.find_one({
        "userId": {"$in": [user_id, user_obj_id]},
        "sessionId": session_id,
    })

    if existing:
        update_fields: Dict[str, Any] = {"updatedAt": datetime.now(timezone.utc)}
        if last_message:
            update_fields["lastMessage"] = last_message[:100]
        if title:
            update_fields["title"] = title
        if file_ids:
            update_fields["fileIds"] = file_ids
        await chat_sessions_collection.update_one(
            {"_id": existing["_id"]},
            {"$set": update_fields},
        )
        saved = await chat_sessions_collection.find_one({"_id": existing["_id"]})
        return _format_session(saved)
    else:
        doc = ChatSessionModel(
            user_id=user_id,
            session_id=session_id,
            title=title or f"Chat {session_id[:8]}",
            file_ids=file_ids or [],
            last_message=last_message[:100],
        )
        await chat_sessions_collection.insert_one(doc.to_dict())
        saved = await chat_sessions_collection.find_one({"_id": doc._id})
        return _format_session(saved)


async def get_user_chat_sessions(user_id: str) -> List[Dict[str, Any]]:
    """Retrieve all chat sessions for user sorted by updatedAt desc."""
    from app.config.database import chat_sessions_collection
    user_obj_id = ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id
    cursor = chat_sessions_collection.find({
        "userId": {"$in": [user_id, user_obj_id]}
    }).sort("updatedAt", -1)
    docs = await cursor.to_list(length=500)
    return [_format_session(d) for d in docs]


async def rename_chat_session(user_id: str, session_id: str, new_title: str) -> Dict[str, Any]:
    """Rename a user chat session."""
    return await touch_chat_session(user_id, session_id, title=new_title)


async def delete_chat_session(user_id: str, session_id: str) -> bool:
    """Delete session metadata and all messages belonging to session."""
    from app.config.database import chat_sessions_collection, session_chats_collection
    user_obj_id = ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id

    await session_chats_collection.delete_many({
        "userId": {"$in": [user_id, user_obj_id]},
        "sessionId": session_id,
    })
    await chat_sessions_collection.delete_many({
        "userId": {"$in": [user_id, user_obj_id]},
        "sessionId": session_id,
    })
    return True


def _format_session(doc: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": str(doc["_id"]),
        "sessionId": doc.get("sessionId", ""),
        "title": doc.get("title", "Untitled Chat"),
        "fileIds": doc.get("fileIds", []),
        "lastMessage": doc.get("lastMessage", ""),
        "createdAt": doc.get("createdAt"),
        "updatedAt": doc.get("updatedAt"),
    }


def _format(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Serialize a MongoDB session_chats document to a clean API dict."""
    return {
        "id": str(doc["_id"]),
        "_id": str(doc["_id"]),
        "userId": str(doc.get("userId", "")),
        "sessionId": doc.get("sessionId", ""),
        "role": doc.get("role", ""),
        "message": doc.get("message", ""),
        "createdAt": doc.get("createdAt"),
        "updatedAt": doc.get("updatedAt"),
    }

