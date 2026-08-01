from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.dependencies import get_current_user
from app.auth.jwt_handler import create_access_token
from app.auth.password import verify_password
from app.schemas.user import (
    MessageSchema,
    Token,
    TokenSchema,
    UserLogin,
    UserLoginSchema,
    UserRegisterSchema,
    UserResponseSchema,
)
from app.services.user_service import UserService, create_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


# ── Register ───────────────────────────────────────────────────────────────────

@router.post(
    "/register",
    response_model=MessageSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new user account",
)
async def register(data: UserRegisterSchema):
    """Register a new user account with hashed password and unique email check."""
    return await create_user(data)


# ── Login ──────────────────────────────────────────────────────────────────────

@router.post(
    "/login",
    response_model=Token,
    status_code=status.HTTP_200_OK,
    summary="Login and receive a JWT access token",
)
async def login(user: UserLogin):
    """Authenticate user with email and password, returning JWT Bearer token."""
    db_user = await UserService.get_user_by_email(user.email)

    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not verify_password(user.password, db_user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    access_token = create_access_token(
        data={
            "sub": str(db_user["_id"]),
            "email": db_user["email"],
        }
    )

    return {"access_token": access_token, "token_type": "bearer"}


# ── Current User ───────────────────────────────────────────────────────────────

@router.get(
    "/me",
    status_code=status.HTTP_200_OK,
    summary="Get currently authenticated user",
)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Protected endpoint returning profile info of the currently logged in user."""
    return {
        "id": str(current_user["_id"]),
        "name": current_user["name"],
        "email": current_user["email"],
        "is_active": current_user.get("is_active", True),
    }


# ── Logout ─────────────────────────────────────────────────────────────────────

@router.post(
    "/logout",
    response_model=MessageSchema,
    status_code=status.HTTP_200_OK,
    summary="Logout current user",
)
async def logout(_: dict = Depends(get_current_user)):
    """Protected logout endpoint (JWT is stateless; client discards token)."""
    return {"message": "Logged out successfully"}
