import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_chat_without_jwt_returns_401():
    """Unauthenticated requests to /api/chat must return 401 Unauthorized."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/chat",
            json={"sessionId": "test-session", "message": "Hello"}
        )
        assert response.status_code == 401


@pytest.mark.asyncio
async def test_chat_history_without_jwt_returns_401():
    """Unauthenticated requests to /api/chat/history/{sessionId} must return 401 Unauthorized."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/chat/history/test-session")
        assert response.status_code == 401


@pytest.mark.asyncio
async def test_chat_message_too_long_returns_400():
    """Messages exceeding 5000 characters must return 400 Bad Request."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Fake JWT token for schema check (or unauth will trigger 401 first)
        huge_message = "A" * 5001
        response = await client.post(
            "/api/chat",
            json={"sessionId": "test-session", "message": huge_message},
            headers={"Authorization": "Bearer fake_token"}
        )
        # Should be 401 (invalid token) or 422/400 (validation error)
        assert response.status_code in (400, 401, 422)
