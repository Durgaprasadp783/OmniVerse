from typing import Any, Dict, List, Optional

from bson import ObjectId

from app.config.database import session_chats_collection
from app.models.chat_message import SessionChatModel

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
) -> Dict[str, Any]:
    """
    Full context-aware RAG pipeline:

        1. Fetch the last MAX_HISTORY_TURNS turns from this session
        2. Format them into a history string
        3. Embed the user's current question
        4. Vector-search the user's documents (optionally scoped to file_id)
        5. Build a history-aware prompt and call Gemini
        6. Save the user message  (before Gemini — so it's always persisted)
        7. Save the assistant answer
        8. Return { answer, sessionId, sources }

    This implements the architecture from Phase 5 Step 3:
        User question → Chat history → Vector search → Gemini → Context-aware answer
    """
    from app.services.embedding_service import generate_embedding
    from app.services.rag_service import generate_context_aware_answer
    from app.services.vector_search_service import search_similar_chunks

    # ── 1. Get conversation history (last N turns) ────────────────────────────
    prior_turns = await get_conversation_history(user_id=user_id, session_id=session_id)

    # ── 2. Format history for the prompt ─────────────────────────────────────
    history_str = format_history(prior_turns)

    # ── 3. Embed the current question ─────────────────────────────────────────
    query_embedding = generate_embedding(message)

    # ── 4. Vector search (user-scoped, optionally file-scoped) ───────────────
    # Determine filename for source metadata if file_id is given
    filename: Optional[str] = None
    if file_id:
        from app.config.database import files_collection
        try:
            from bson import ObjectId as OID
            f = await files_collection.find_one({"_id": OID(file_id)})
            if f:
                filename = f.get("originalName")
        except Exception:
            pass

    retrieved_chunks = await search_similar_chunks(
        user_id=user_id,
        query_embedding=query_embedding,
        file_id=file_id,
        filename=filename,
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

    # ── 8. Return structured response ─────────────────────────────────────────
    return {
        "answer": answer,
        "sessionId": session_id,
        "sources": sources,
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
