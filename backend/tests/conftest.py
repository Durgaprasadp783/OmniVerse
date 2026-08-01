import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.config.database import db


@pytest_asyncio.fixture(scope="session")
async def async_client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client


@pytest_asyncio.fixture(autouse=True, scope="function")
async def cleanup_test_user():
    # Clean up test user before and after each test
    await db["users"].delete_many({"email": "durga@example.com"})
    yield
    await db["users"].delete_many({"email": "durga@example.com"})
