import math
import re
from typing import Any, Dict, List, Optional
from bson import ObjectId
from app.config.database import chunks_collection

# ── Retrieval settings ────────────────────────────────────────────────────────
TOP_K = 5
NUM_CANDIDATES = 50          # fetch this many before scoring (future Atlas use)
MIN_SIMILARITY = 0.30        # minimum cosine-similarity threshold (Gemini embedding scale)
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



def normalize_text(text: Optional[str]) -> str:
    """
    Normalize text by lowercasing, stripping, and collapsing whitespace.
    """
    if not text:
        return ""
    return re.sub(r"\s+", " ", text).strip().lower()



def remove_duplicate_chunks(chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Remove duplicate chunks based on chunk _id / chunkId and normalized text content.

    Args:
        chunks: List of chunk dictionaries (or wrapped chunk result dicts).

    Returns:
        List of deduplicated chunk dictionaries preserving original order.
    """
    seen_texts = set()
    seen_ids = set()
    unique_chunks = []

    for item in chunks:
        chunk_obj = item.get("chunk") if isinstance(item.get("chunk"), dict) else item

        # 1. Check ID duplicate if ID exists
        raw_id = chunk_obj.get("_id") or chunk_obj.get("chunkId")
        if raw_id is not None:
            chunk_id_str = str(raw_id)
            if chunk_id_str in seen_ids:
                continue

        # 2. Check normalized text content
        raw_text = chunk_obj.get("text", "")
        normalized = normalize_text(raw_text)

        if not normalized:
            continue

        if normalized in seen_texts:
            continue

        # Add to seen sets and retain chunk
        if raw_id is not None:
            seen_ids.add(str(raw_id))
        seen_texts.add(normalized)

        unique_chunks.append(item)

    return unique_chunks


def apply_page_diversity(chunks: List[Dict[str, Any]], top_k: int = TOP_K) -> List[Dict[str, Any]]:
    """
    Filter chunks so that we prioritize chunks from distinct pages (up to top_k).
    Fills remaining slots with next highest-scoring chunks if fewer distinct pages exist.

    Args:
        chunks: Deduplicated list of chunk items.
        top_k: Maximum number of chunks to select (default 5).

    Returns:
        List of up to top_k page-diverse chunks.
    """
    selected = []
    seen_pages = set()
    remaining = []

    for item in chunks:
        c = item.get("chunk") if isinstance(item.get("chunk"), dict) else item
        page = (c.get("metadata") or {}).get("page")

        if page is not None and page in seen_pages:
            remaining.append(item)
            continue

        selected.append(item)
        if page is not None:
            seen_pages.add(page)

        if len(selected) == top_k:
            break

    if len(selected) < top_k:
        for item in remaining:
            if item not in selected:
                selected.append(item)
                if len(selected) == top_k:
                    break

    return selected


def calculate_keyword_score(query: str, text: str) -> float:
    """
    Calculate a keyword relevance score between 0.0 and 1.0 based on term matches.
    """
    if not query or not text:
        return 0.0

    query_terms = set(re.findall(r"\w+", query.lower()))
    if not query_terms:
        return 0.0

    text_lower = text.lower()
    matches = 0
    total_occurrences = 0

    for term in query_terms:
        if term in text_lower:
            matches += 1
            total_occurrences += text_lower.count(term)

    coverage = matches / len(query_terms)
    density = min(total_occurrences / max(len(text_lower.split()), 1), 1.0)

    return min(1.0, (0.7 * coverage) + (0.3 * density))


def rerank_chunks(
    candidates: List[Dict[str, Any]],
    query: str,
    top_k: int = TOP_K,
) -> List[Dict[str, Any]]:
    """
    Rerank a pool of top candidate chunks using a multi-factor scoring function:
      RerankScore = (0.65 * VectorSimilarity) + (0.25 * KeywordScore) + (0.10 * DiversityBoost)
    """
    if not candidates:
        return []

    seen_pages = set()
    reranked = []

    for item in candidates:
        chunk = item.get("chunk", item)
        vector_score = item.get("score", item.get("similarity", 0.0))
        text = chunk.get("text", "")
        kw_score = calculate_keyword_score(query, text)

        page = (chunk.get("metadata") or {}).get("page")
        diversity_boost = 1.0 if (page is not None and page not in seen_pages) else 0.5
        if page is not None:
            seen_pages.add(page)

        final_score = (0.65 * vector_score) + (0.25 * kw_score) + (0.10 * diversity_boost)

        item_copy = dict(item)
        item_copy["rerankedScore"] = round(final_score, 4)
        item_copy["keywordScore"] = round(kw_score, 4)
        item_copy["score"] = max(vector_score, final_score)
        reranked.append(item_copy)

    reranked.sort(key=lambda x: x.get("rerankedScore", 0.0), reverse=True)
    return reranked[:top_k]


async def search_similar_chunks(
    user_id: str,
    query_embedding: List[float],
    file_id: Optional[str] = None,
    file_ids: Optional[List[str]] = None,
    top_k: int = TOP_K,
    min_similarity: float = MIN_SIMILARITY,
    filename: Optional[str] = None,
    query_text: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Find the most semantically similar and reranked chunks for a user.

    Supports:
      - Single document isolation (`file_id`) or multi-document scope (`file_ids`).
      - Candidate expansion (fetches top 15 candidates before reranking).
      - Candidate Reranking (combines vector similarity, keyword density, and page diversity).
      - Structural source metadata with file ID, filename, page, and scores.
    """
    # ── 1. Build query filter (user isolation + optional file scope) ──────────
    user_obj_id = ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id

    filter_doc: Dict[str, Any] = {
        "userId": {"$in": [user_id, user_obj_id]},
        "embedding": {"$exists": True, "$ne": []},
    }

    # Normalize file scoping (support file_id or file_ids list)
    target_ids = []
    if file_ids:
        target_ids.extend(file_ids)
    if file_id and file_id not in target_ids:
        target_ids.append(file_id)

    if target_ids:
        expanded_file_ids = []
        for fid in target_ids:
            expanded_file_ids.append(fid)
            if ObjectId.is_valid(fid):
                expanded_file_ids.append(ObjectId(fid))
        filter_doc["fileId"] = {"$in": expanded_file_ids}

    # ── 2. Fetch candidate chunks from MongoDB ────────────────────────────────
    cursor = chunks_collection.find(filter_doc)
    chunks = await cursor.to_list(length=10000)

    # ── 3. Score every chunk with cosine similarity ───────────────────────────
    scored: List[Dict[str, Any]] = []
    for chunk in chunks:
        score = cosine_similarity(query_embedding, chunk.get("embedding", []))
        scored.append({"chunk": chunk, "score": score})

    # ── 4. Sort descending by vector similarity ───────────────────────────────
    scored.sort(key=lambda x: x["score"], reverse=True)

    # ── 5. Retrieve top-15 candidate pool for reranking ───────────────────────
    top_candidates = scored[:15]

    # ── 6. Apply similarity threshold with candidate fallback ────────────────
    filtered_results = [item for item in top_candidates if item["score"] >= min_similarity]

    if not filtered_results and top_candidates and top_candidates[0]["score"] > 0.15:
        filtered_results = top_candidates

    # ── 7. Deduplicate retrieved chunks ──────────────────────────────────────
    unique_chunks = remove_duplicate_chunks(filtered_results)

    # ── 8. Rerank top candidates using hybrid score & page diversity ────────
    if query_text:
        reranked = rerank_chunks(unique_chunks, query=query_text, top_k=top_k)
    else:
        reranked = apply_page_diversity(unique_chunks, top_k=top_k)

    # ── 9. Build structured results with source metadata ────────────────────
    results: List[Dict[str, Any]] = []
    for item in reranked:
        c = item.get("chunk", item)
        page_val = (c.get("metadata") or {}).get("page")
        chunk_file_id = str(c.get("fileId", ""))
        chunk_filename = filename or c.get("filename") or chunk_file_id

        score_val = round(item.get("score", item.get("similarity", 0.0)), 4)
        results.append({
            "text": c.get("text", ""),
            "source": {
                "fileId": chunk_file_id,
                "filename": chunk_filename,
                "page": page_val,
                "chunkIndex": c.get("chunkIndex"),
            },
            "similarity": score_val,
            "score": score_val,
            "rerankedScore": item.get("rerankedScore", score_val),
            "_id": c.get("_id"),
            "chunkIndex": c.get("chunkIndex"),
        })

    return results


async def hybrid_search_chunks(
    user_id: str,
    query: str,
    query_embedding: Optional[List[float]] = None,
    file_ids: Optional[List[str]] = None,
    page_filter: Optional[int] = None,
    top_k: int = TOP_K,
) -> List[Dict[str, Any]]:
    """
    Advanced Hybrid Search combining vector search + keyword matching + page filtering.
    """
    from app.services.embedding_service import generate_embedding
    if not query_embedding and query:
        query_embedding = generate_embedding(query)

    user_obj_id = ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id
    filter_doc: Dict[str, Any] = {"userId": {"$in": [user_id, user_obj_id]}}

    if file_ids:
        expanded_file_ids = []
        for fid in file_ids:
            expanded_file_ids.append(fid)
            if ObjectId.is_valid(fid):
                expanded_file_ids.append(ObjectId(fid))
        filter_doc["fileId"] = {"$in": expanded_file_ids}

    if page_filter is not None:
        filter_doc["metadata.page"] = page_filter

    cursor = chunks_collection.find(filter_doc)
    chunks = await cursor.to_list(length=10000)

    scored: List[Dict[str, Any]] = []
    for chunk in chunks:
        vec_sim = cosine_similarity(query_embedding, chunk.get("embedding", [])) if query_embedding else 0.0
        kw_sim = calculate_keyword_score(query, chunk.get("text", ""))
        hybrid_score = (0.6 * vec_sim) + (0.4 * kw_sim)

        scored.append({
            "chunk": chunk,
            "score": round(hybrid_score, 4),
            "vectorScore": round(vec_sim, 4),
            "keywordScore": round(kw_sim, 4),
        })

    scored.sort(key=lambda x: x["score"], reverse=True)
    unique_scored = remove_duplicate_chunks(scored[:20])
    reranked = rerank_chunks(unique_scored, query=query, top_k=top_k)

    results = []
    for item in reranked:
        c = item["chunk"]
        results.append({
            "text": c.get("text", ""),
            "source": {
                "fileId": str(c.get("fileId", "")),
                "filename": c.get("filename", str(c.get("fileId", ""))),
                "page": (c.get("metadata") or {}).get("page"),
                "chunkIndex": c.get("chunkIndex"),
            },
            "similarity": item.get("score", 0.0),
            "vectorScore": item.get("vectorScore", 0.0),
            "keywordScore": item.get("keywordScore", 0.0),
            "rerankedScore": item.get("rerankedScore", 0.0),
            "_id": str(c.get("_id", "")),
            "chunkIndex": c.get("chunkIndex"),
        })

    return results



