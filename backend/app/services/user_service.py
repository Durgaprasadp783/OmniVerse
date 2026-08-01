from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId
from fastapi import HTTPException, status

from app.config.database import users_collection
from app.auth.password import hash_password, verify_password
from app.schemas.user import UserRegisterSchema, UserLoginSchema


class UserService:

    @staticmethod
    async def get_user_by_email(email: str) -> Optional[dict]:
        """Fetch a user document by email address."""
        return await users_collection.find_one({"email": email})

    @staticmethod
    async def get_user_by_id(user_id: str) -> Optional[dict]:
        """Fetch a user document by MongoDB ObjectId string."""
        return await users_collection.find_one({"_id": ObjectId(user_id)})

    @staticmethod
    async def create_user(data: UserRegisterSchema) -> dict:
        """
        Register a new user.
        - Checks for duplicate email (409 Conflict)
        - Hashes password with bcrypt before storing
        - Adds created_at timestamp and is_active flag
        """
        existing = await users_collection.find_one({"email": data.email})
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists",
            )

        user_dict = data.model_dump()
        user_dict["password"] = hash_password(user_dict["password"])
        user_dict["created_at"] = datetime.now(timezone.utc)
        user_dict["updated_at"] = datetime.now(timezone.utc)
        user_dict["is_active"] = True

        result = await users_collection.insert_one(user_dict)
        return await users_collection.find_one({"_id": result.inserted_id})

    @staticmethod
    async def authenticate_user(data: UserLoginSchema) -> dict:
        """
        Authenticate a user by email and password.
        - Raises HTTP 401 for invalid credentials
        - Raises HTTP 403 for inactive accounts
        """
        user = await users_collection.find_one({"email": data.email})

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        if not verify_password(data.password, user["password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        if not user.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is inactive",
            )

        return user


# ── Standalone helpers (backward compatible) ───────────────────────────────────

async def create_user(data: UserRegisterSchema) -> dict:
    await UserService.create_user(data)
    return {"message": "User created successfully"}


async def authenticate_user(data: UserLoginSchema) -> dict:
    return await UserService.authenticate_user(data)


async def get_user_by_email(email: str) -> Optional[dict]:
    return await UserService.get_user_by_email(email)
