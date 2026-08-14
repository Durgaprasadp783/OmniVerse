import re
from typing import List

DEFAULT_CHUNK_SIZE = 800
DEFAULT_CHUNK_OVERLAP = 150


def clean_text(text: str) -> str:
    """Clean extracted PDF text before chunking."""
    if not text:
        return ""
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    return "\n".join(lines)



def split_text_into_chunks(
    text: str,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    overlap: int = DEFAULT_CHUNK_OVERLAP,
) -> List[str]:
    """
    Split text into word-based chunks of specified size with overlap.

    Args:
        text: Input text string.
        chunk_size: Target number of words per chunk (default 800).
        overlap: Number of overlapping words between consecutive chunks (default 150).

    Returns:
        List of chunk strings.
    """
    if not text or not text.strip():
        return []

    if overlap >= chunk_size:
        raise ValueError("Chunk overlap must be smaller than chunk size")

    cleaned_text = clean_text(text)
    if not cleaned_text:
        return []

    words = re.split(r"\s+", cleaned_text)
    chunks = []
    start = 0
    words_count = len(words)

    while start < words_count:
        end = min(start + chunk_size, words_count)
        chunk = " ".join(words[start:end]).strip()

        if chunk:
            chunks.append(chunk)

        if end >= words_count:
            break

        start = end - overlap

    return chunks

