from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ── Request Schemas ────────────────────────────────────────────────────────────

class UserRegisterSchema(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, json_schema_extra={"example": "Durga Prasad"})
    email: EmailStr = Field(..., json_schema_extra={"example": "durga@example.com"})
    password: str = Field(..., min_length=8, json_schema_extra={"example": "StrongPassword123!"})


class UserLoginSchema(BaseModel):
    email: EmailStr = Field(..., json_schema_extra={"example": "durga@example.com"})
    password: str = Field(..., json_schema_extra={"example": "StrongPassword123!"})


# ── Response Schemas ───────────────────────────────────────────────────────────

class UserResponseSchema(BaseModel):
    id: str
    name: str
    email: str
    is_active: Optional[bool] = True
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class TokenSchema(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MessageSchema(BaseModel):
    message: str


# ── Additional Schemas ─────────────────────────────────────────────────────────

# Register Request
class UserRegister(BaseModel):
    name: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)


# Login Request
class UserLogin(BaseModel):
    email: EmailStr
    password: str


# User Response
class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


# JWT Token Response
class Token(BaseModel):
    access_token: str
    token_type: str


# JWT Payload
class TokenData(BaseModel):
    email: Optional[str] = None
