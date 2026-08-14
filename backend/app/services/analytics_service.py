import re
from collections import Counter
from typing import Any, Dict, List
from bson import ObjectId
from app.config.database import chat_messages_collection, chat_sessions_collection, chunks_collection, files_collection, session_chats_collection


STOP_WORDS = {
    "what", "is", "the", "a", "an", "and", "or", "in", "of", "to", "for", "with", "on", "at",
    "by", "from", "up", "about", "into", "over", "after", "how", "why", "which", "where",
    "can", "you", "tell", "me", "more", "explain", "summarize", "list", "are", "it", "this",
    "that", "these", "those", "does", "do", "did", "was", "were", "been", "being", "have", "has"
}


async def get_user_analytics(user_id: str) -> Dict[str, Any]:
    """Calculate comprehensive document, chunk, word, and query analytics for user."""
    user_obj_id = ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id

    # 1. Fetch user files
    file_cursor = files_collection.find({"userId": {"$in": [user_id, user_obj_id]}})
    user_files = await file_cursor.to_list(length=1000)

    total_files = len(user_files)
    total_pages = sum(f.get("pageCount", 0) for f in user_files)

    total_words = 0
    file_stats = []

    for f in user_files:
        fid_str = str(f["_id"])
        fid_obj = f["_id"]
        txt = f.get("extractedText", "")
        w_count = f.get("wordCount")
        if w_count is None:
            w_count = len(txt.split()) if txt else 0

        # Count chunks for this file
        chunk_c = await chunks_collection.count_documents({
            "userId": {"$in": [user_id, user_obj_id]},
            "fileId": {"$in": [fid_str, fid_obj]},
        })

        # Count questions asked for this file
        q_count = await chat_messages_collection.count_documents({
            "userId": {"$in": [user_id, user_obj_id]},
            "fileId": {"$in": [fid_str, fid_obj]},
            "role": "user",
        })

        total_words += w_count

        file_stats.append({
            "fileId": fid_str,
            "filename": f.get("originalName", "Unnamed"),
            "pages": f.get("pageCount", 0),
            "chunks": chunk_c,
            "words": w_count,
            "questions": q_count,
            "createdAt": f.get("createdAt"),
            "processed": f.get("processed", False),
        })

    # 2. Total Chunks across all user files
    total_chunks = await chunks_collection.count_documents({"userId": {"$in": [user_id, user_obj_id]}})

    # 3. Total Chat Sessions
    total_sessions = await chat_sessions_collection.count_documents({"userId": {"$in": [user_id, user_obj_id]}})

    # 4. Total Questions Asked across file chats + session chats
    file_q_total = await chat_messages_collection.count_documents({
        "userId": {"$in": [user_id, user_obj_id]},
        "role": "user",
    })
    session_q_total = await session_chats_collection.count_documents({
        "userId": {"$in": [user_id, user_obj_id]},
        "role": "user",
    })
    total_questions = file_q_total + session_q_total

    # 5. Extract top topics / keywords from user questions
    user_msgs_cursor = session_chats_collection.find(
        {"userId": {"$in": [user_id, user_obj_id]}, "role": "user"},
        {"message": 1}
    ).limit(500)
    user_msgs = await user_msgs_cursor.to_list(length=500)

    file_msgs_cursor = chat_messages_collection.find(
        {"userId": {"$in": [user_id, user_obj_id]}, "role": "user"},
        {"content": 1, "message": 1}
    ).limit(500)
    file_msgs = await file_msgs_cursor.to_list(length=500)

    words_list = []
    for m in user_msgs + file_msgs:
        txt = m.get("message") or m.get("content") or ""
        tokens = re.findall(r"\b[A-Za-z]{3,}\b", txt.lower())
        for token in tokens:
            if token not in STOP_WORDS:
                words_list.append(token.capitalize())

    top_counter = Counter(words_list)
    top_topics = [{"topic": topic, "count": count} for topic, count in top_counter.most_common(10)]

    return {
        "summary": {
            "totalDocuments": total_files,
            "totalPages": total_pages,
            "totalChunks": total_chunks,
            "totalWords": total_words,
            "totalQuestions": total_questions,
            "totalSessions": total_sessions,
            "mostAskedTopic": top_topics[0]["topic"] if top_topics else "N/A",
        },
        "topTopics": top_topics,
        "documents": file_stats,
    }
