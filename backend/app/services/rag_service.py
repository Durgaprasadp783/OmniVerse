import os
from typing import Any, Dict, List, Optional
from google import genai
from app.config.settings import settings
from app.services.vector_search_service import MIN_SIMILARITY


def get_gemini_api_key() -> str:
    key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")
    if not key or key == "your_api_key_here":
        env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
        if os.path.exists(env_path):
            from dotenv import dotenv_values
            env_vars = dotenv_values(env_path)
            key = env_vars.get("GEMINI_API_KEY", "") or key
    return key


def _call_gemini(prompt: str) -> str:
    """Send a prompt to Gemini and return the response text. Tries model fallbacks."""
    api_key = get_gemini_api_key()
    if not api_key or api_key == "your_api_key_here":
        raise ValueError("GEMINI_API_KEY is not configured. Please set it in backend/.env")

    client = genai.Client(api_key=api_key)
    candidate_models = ["gemini-2.5-flash-lite", "gemini-2.0-flash-lite", "gemini-1.5-flash"]

    last_err = None
    for model_name in candidate_models:
        try:
            response = client.models.generate_content(model=model_name, contents=prompt)
            if response:
                return response.text or "No response generated."
        except Exception as err:
            last_err = err
            continue

    raise RuntimeError(f"Failed to generate answer with Gemini models: {str(last_err)}")


def generate_rag_answer(question: str, chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Generate an answer to a question using ONLY the provided document chunks as context.
    (File-scoped RAG — no conversation history.)
    """
    if not question or not question.strip():
        raise ValueError("Question is required")

    # Filter chunks by MIN_SIMILARITY threshold if score is present
    relevant_chunks = [
        chunk for chunk in chunks
        if chunk.get("score") is None or float(chunk.get("score", 0.0)) >= MIN_SIMILARITY
    ]

    if not relevant_chunks:
        return {
            "answer": "I could not find relevant information in the document.",
            "sources": [],
        }

    context_blocks = [
        f"SOURCE {index + 1}:\n{chunk.get('text', '')}"
        for index, chunk in enumerate(relevant_chunks)
    ]
    context = "\n\n".join(context_blocks)

    prompt = f"""You are OmniVerse, an AI document assistant.

Answer the user's question using ONLY the provided document context passages.

Rules:
1. Base your answer on the provided document context passages.
2. If the user asks for main topics, key concepts, or a summary, synthesize the information present in the document context passages.
3. Do not invent facts that are not supported by the context.
4. If the document context does not contain information to answer the question at all, say:
   "I could not find relevant information in the document."

DOCUMENT CONTEXT:
{context}

USER QUESTION:
{question}

Answer:
"""

    answer_text = _call_gemini(prompt)

    sources = [
        {
            "source": index + 1,
            "chunkId": str(chunk.get("_id", chunk.get("chunkId", ""))),
            "chunkIndex": chunk.get("chunkIndex", 0),
            "score": round(float(chunk.get("score", chunk.get("similarity", 0.0))), 4),
            "similarity": round(float(chunk.get("similarity", chunk.get("score", 0.0))), 4),
            # Source metadata from structured retrieval
            "fileId": (chunk.get("source") or {}).get("fileId", str(chunk.get("fileId", ""))),
            "filename": (chunk.get("source") or {}).get("filename", str(chunk.get("filename", ""))),
            "page": (chunk.get("source") or {}).get("page"),
        }
        for index, chunk in enumerate(relevant_chunks)
    ]

    return {
        "answer": answer_text,
        "sources": sources,
    }


def generate_context_aware_answer(
    question: str,
    chunks: List[Dict[str, Any]],
    history: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Generate a context-aware RAG answer that incorporates conversation history.

    This enables OmniVerse to resolve references like "it", "the first method",
    or "what else?" by injecting previous turns into the prompt.

    Prompt structure (mirrors the tutorial's Step 3 prompt):
        Conversation History   (last N formatted turns)
        +
        Document Context       (retrieved chunks)
        +
        Current Question

    Args:
        question: The user's current message.
        chunks:   Retrieved document chunks from vector search.
        history:  Pre-formatted conversation string ("role: message\\n...").
                  Pass None or "" when the session is brand new.

    Returns:
        { answer: str, sources: List[dict] }
    """
    if not question or not question.strip():
        raise ValueError("Question is required")

    # Build context from retrieved chunks (already filtered by MIN_SIMILARITY in vector search)
    if chunks:
        context_parts = []
        for chunk in chunks:
            src = chunk.get("source") or {}
            filename = src.get("filename") or "Unknown"
            page = src.get("page") if src.get("page") is not None else "N/A"
            text = chunk.get("text", "")
            context_parts.append(
                f"Source: {filename}\nPage: {page}\n\n{text}"
            )
        context = "\n---\n".join(context_parts)
    else:
        context = "(No relevant document chunks were retrieved for this question.)"

    history_section = history.strip() if history and history.strip() else "(No previous conversation.)"

    prompt = f"""You are OmniVerse, an AI document assistant.

Answer the user's question using the provided document context and conversation history.

Rules:
1. Base your answer on the provided document context passages.
2. If the user asks for main topics, key concepts, or a summary, synthesize the information present in the document context passages.
3. Use conversation history to understand follow-up questions and references (such as "it", "they", "the first method", "what else?").
4. Do not invent facts that are not supported by the document context.
5. If the document context does not contain information to answer the question at all, clearly say:
   "I could not find relevant information in the document."

Conversation History:
{history_section}

Document Context:
{context}

Current Question:
{question}

Answer:"""

    answer_text = _call_gemini(prompt)

    # Build sources list from retrieved chunks
    sources = []
    for index, chunk in enumerate(chunks):
        src = chunk.get("source") or {}
        sources.append({
            "source": index + 1,
            "filename": src.get("filename", ""),
            "page": src.get("page"),
            "fileId": src.get("fileId", ""),
            "chunkIndex": chunk.get("chunkIndex"),
            "similarity": round(float(chunk.get("similarity", chunk.get("score", 0.0))), 4),
        })

    return {
        "answer": answer_text,
        "sources": sources,
    }
