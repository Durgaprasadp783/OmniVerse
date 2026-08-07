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


db = DBProxy()

# Named collection shortcuts
users_collection = CollectionProxy("users")
documents_collection = CollectionProxy("documents")
files_collection = CollectionProxy("files")
chat_collection = CollectionProxy("chat_history")
