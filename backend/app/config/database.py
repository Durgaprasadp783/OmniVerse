import asyncio
from typing import Dict
from motor.motor_asyncio import AsyncIOMotorClient
from app.config.settings import settings

_clients: Dict[int, AsyncIOMotorClient] = {}


def get_db():
    """Returns the Motor Database for the currently running event loop."""
    try:
        loop = asyncio.get_running_loop()
        loop_id = id(loop)
    except RuntimeError:
        loop_id = 0

    if loop_id not in _clients:
        _clients[loop_id] = AsyncIOMotorClient(settings.MONGODB_URI)

    return _clients[loop_id][settings.DATABASE_NAME]


class DBProxy:
    """Routes db['collection'] to the current event loop's client."""

    def __getitem__(self, collection_name: str):
        return get_db()[collection_name]


class CollectionProxy:
    """Routes collection method calls to the current event loop's client."""

    def __init__(self, collection_name: str):
        self._name = collection_name

    def __getattr__(self, method_name: str):
        return getattr(get_db()[self._name], method_name)


async def init_db_indexes():
    """
    Ensure all standard collection indexes exist on startup for query performance and security enforcement.
    """
    try:
        target_db = get_db()

        # Users: unique email index
        await target_db["users"].create_index("email", unique=True)

        # Files: user index sorted by creation date
        await target_db["files"].create_index([("userId", 1), ("createdAt", -1)])

        # Chunks: compound index for fast user+file retrieval
        await target_db["chunks"].create_index([("userId", 1), ("fileId", 1), ("chunkIndex", 1)])

        # Session chats: user + session thread history index
        await target_db["session_chats"].create_index([("userId", 1), ("sessionId", 1), ("createdAt", 1)])

        print("✅ MongoDB database indexes verified successfully.")
    except Exception as err:
        print(f"⚠️ Index initialization warning: {err}")


db = DBProxy()

# Named collection shortcuts
users_collection = CollectionProxy("users")
documents_collection = CollectionProxy("documents")
files_collection = CollectionProxy("files")
chat_collection = CollectionProxy("chat_history")
chat_messages_collection = CollectionProxy("chat_messages")
chunks_collection = CollectionProxy("chunks")
session_chats_collection = CollectionProxy("session_chats")
chat_sessions_collection = CollectionProxy("chat_sessions")




