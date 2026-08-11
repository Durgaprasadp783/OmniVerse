import math
from typing import Any, Dict, List, Optional
from bson import ObjectId
from app.config.database import chunks_collection

# ── Retrieval settings ────────────────────────────────────────────────────────
TOP_K = 5
NUM_CANDIDATES = 50          # fetch this many before scoring (future Atlas use)
MIN_SIMILARITY = 0.45        # minimum cosine-similarity threshold (Gemini embedding scale)
# ─────────────────────────────────────────────────────────────────────────────


def cosine_similarity(a: List[float], b: List[float]) -> float:
    """
    Calculate cosine similarity between two numerical vectors.
    Returns value between -1.0 and 1.0 (0.0 if invalid or zero vectors).
    """
    if not a or not b or len(a) != len(b):
        return 0.0

    dot_product = 0.0
    magnitude_a = 0.0
    magnitude_b = 0.0

    for val_a, val_b in zip(a, b):
        dot_product += val_a * val_b
        magnitude_a += val_a * val_a
        magnitude_b += val_b * val_b

    if magnitude_a == 0.0 or magnitude_b == 0.0:
        return 0.0

    return dot_product / (math.sqrt(magnitude_a) * math.sqrt(magnitude_b))


async def search_similar_chunks(
    user_id: str,
    query_embedding: List[float],
    file_id: Optional[str] = None,
    top_k: int = TOP_K,
    min_similarity: float = MIN_SIMILARITY,
    filename: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Find the most semantically similar chunks for a user using cosine similarity.

    Enforces:
      - User isolation  — only chunks belonging to `user_id` are searched.
      - Similarity gate — chunks below `min_similarity` are discarded.
      - Source metadata — each result carries text, fileId, filename, page,
                          chunkIndex and similarity score.

    Args:
        user_id:         Authenticated user's ID (str or ObjectId-compatible).
        query_embedding: Embedding vector of the user's question.
        file_id:         Optional — restrict search to a single file.
        top_k:           Maximum number of results to return.
        min_similarity:  Minimum cosine-similarity threshold (default 0.70).
        filename:        Optional original filename to attach to results
                         (pass it from the file_doc already fetched in the caller).

    Returns:
        List of dicts, each with:
            text       – chunk text
            source     – { fileId, filename, page, chunkIndex }
            similarity – cosine similarity score (float, 4 dp)
    """
    # ── 1. Build query filter (user isolation + optional file scope) ──────────
    user_obj_id = ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id

    filter_doc: Dict[str, Any] = {
        "userId": {"$in": [user_id, user_obj_id]},
        "embedding": {"$exists": True, "$ne": []},
    }

    if file_id:
        file_obj_id = ObjectId(file_id) if ObjectId.is_valid(file_id) else file_id
        filter_doc["fileId"] = {"$in": [file_id, file_obj_id]}

    # ── 2. Fetch candidate chunks from MongoDB ────────────────────────────────
    cursor = chunks_collection.find(filter_doc)
    chunks = await cursor.to_list(length=10000)

    # ── 3. Score every chunk with cosine similarity ───────────────────────────
    scored: List[Dict[str, Any]] = []
    for chunk in chunks:
        score = cosine_similarity(query_embedding, chunk.get("embedding", []))
        scored.append({"chunk": chunk, "score": score})

    # ── 4. Sort descending by score ───────────────────────────────────────────
    scored.sort(key=lambda x: x["score"], reverse=True)

    # ── 5. Apply similarity threshold (reject weak matches) ───────────────────
    filtered = [item for item in scored if item["score"] >= min_similarity]

    # ── 6. Keep only top-k ───────────────────────────────────────────────────
    top_results = filtered[:top_k]

    # ── 7. Log retrieved chunks for debugging ────────────────────────────────
    print(f"\n[VectorSearch] Retrieved chunks: {len(top_results)} "
          f"(threshold={min_similarity}, top_k={top_k})")
    for i, item in enumerate(top_results):
        c = item["chunk"]
        page_val = (c.get("metadata") or {}).get("page")
        print(
            f"  Chunk {i + 1} | Similarity: {item['score']:.4f} | "
            f"File: {filename or str(c.get('fileId', ''))} | "
            f"ChunkIndex: {c.get('chunkIndex')} | Page: {page_val}"
        )

    # ── 8. Build structured results with source metadata ─────────────────────
    results: List[Dict[str, Any]] = []
    for item in top_results:
        c = item["chunk"]
        page_val = (c.get("metadata") or {}).get("page")
        results.append({
            "text": c.get("text", ""),
            "source": {
                "fileId": str(c.get("fileId", "")),
                "filename": filename or str(c.get("fileId", "")),
                "page": page_val,
                "chunkIndex": c.get("chunkIndex"),
            },
            "similarity": round(item["score"], 4),
            # Keep raw fields so callers that still access chunk["_id"] etc. work
            "_id": c.get("_id"),
            "chunkIndex": c.get("chunkIndex"),
            "score": round(item["score"], 4),
        })

    return results
