import re
from typing import List

DEFAULT_CHUNK_SIZE = 1000
DEFAULT_CHUNK_OVERLAP = 200


def clean_text(text: str) -> str:
    """Clean text by normalizing newlines and whitespace."""
    if not text:
        return ""
    text = text.replace("\r\n", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def split_text_into_chunks(
    text: str,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    overlap: int = DEFAULT_CHUNK_OVERLAP,
) -> List[str]:
    """
    Split text into chunks of specified size with overlap,
    preserving sentence and paragraph boundaries where possible.
    """
    if not text or not text.strip():
        return []

    if overlap >= chunk_size:
        raise ValueError("Chunk overlap must be smaller than chunk size")

    cleaned_text = clean_text(text)
    if not cleaned_text:
        return []

    chunks = []
    start = 0
    text_length = len(cleaned_text)

    while start < text_length:
        end = min(start + chunk_size, text_length)

        # Prefer ending at a paragraph or sentence boundary
        if end < text_length:
            boundary = cleaned_text.rfind("\n\n", start, end)

            if boundary > start + chunk_size * 0.5:
                end = boundary
            else:
                s1 = cleaned_text.rfind(". ", start, end)
                s2 = cleaned_text.rfind("? ", start, end)
                s3 = cleaned_text.rfind("! ", start, end)
                sentence_boundary = max(s1, s2, s3)

                if sentence_boundary > start + chunk_size * 0.5:
                    end = sentence_boundary + 1

        chunk = cleaned_text[start:end].strip()

        if chunk:
            chunks.append(chunk)

        if end >= text_length:
            break

        start = max(end - overlap, start + 1)

    return chunks
