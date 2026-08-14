import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.vector_search_service import calculate_keyword_score, rerank_chunks

client = TestClient(app)


def test_keyword_score_and_reranker():
    query = "DevOps Pipeline Jenkins"
    text_1 = "Jenkins is an open source automation server used to set up CI CD DevOps pipelines."
    text_2 = "Artificial intelligence and neural networks are used for deep learning."

    score_1 = calculate_keyword_score(query, text_1)
    score_2 = calculate_keyword_score(query, text_2)

    assert score_1 > score_2
    assert score_1 > 0.3

    candidates = [
        {"chunk": {"text": text_2, "metadata": {"page": 1}}, "score": 0.85},
        {"chunk": {"text": text_1, "metadata": {"page": 2}}, "score": 0.70},
    ]

    reranked = rerank_chunks(candidates, query=query, top_k=2)
    assert len(reranked) == 2
    assert reranked[0]["chunk"]["text"] == text_1  # High keyword relevance should rank text_1 higher


@pytest.mark.asyncio
async def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
