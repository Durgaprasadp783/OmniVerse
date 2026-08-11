import os
from typing import List
from google import genai
from app.config.settings import settings


def get_gemini_api_key() -> str:
    key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")
    if not key or key == "your_api_key_here":
        env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
        if os.path.exists(env_path):
            from dotenv import dotenv_values
            env_vars = dotenv_values(env_path)
            key = env_vars.get("GEMINI_API_KEY", "") or key
    return key


def generate_embedding(text: str) -> List[float]:
    """
    Generate vector embedding for a given text chunk using Google GenAI SDK.
    Model: text-embedding-004
    """
    if not text or not text.strip():
        raise ValueError("Text is required for embedding")

    api_key = get_gemini_api_key()
    if not api_key or api_key == "your_api_key_here":
        raise ValueError("GEMINI_API_KEY is not configured. Please set your GEMINI_API_KEY in backend/.env")

    client = genai.Client(api_key=api_key)


    response = client.models.embed_content(
        model="gemini-embedding-001",
        contents=text,
    )


    if hasattr(response, "embedding") and response.embedding and response.embedding.values is not None:
        return list(response.embedding.values)
    elif hasattr(response, "embeddings") and response.embeddings and len(response.embeddings) > 0 and response.embeddings[0].values is not None:
        return list(response.embeddings[0].values)
    else:
        raise RuntimeError("Failed to retrieve embedding vector from Gemini API response")

