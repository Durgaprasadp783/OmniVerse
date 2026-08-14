import time
import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.analytics import router as analytics_router
from app.api.auth import router as auth_router
from app.api.chat import router as chat_router
from app.api.files import router as files_router
from app.api.study import router as study_router
from app.config.database import get_db, init_db_indexes
from app.config.settings import settings

# ── Structured Logging ────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("omniverse.api")


# ── Lifespan Context Manager ──────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"🚀 Initializing OmniVerse API [Environment: {settings.ENVIRONMENT}]")
    try:
        await init_db_indexes()
    except Exception as err:
        logger.warning(f"Index initialization warning: {err}")
    yield
    logger.info("👋 Shutting down OmniVerse API...")


app = FastAPI(
    title="OmniVerse API",
    description="Production-ready RAG Assistant API for Multi-Modal Documents",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
)

# ── CORS Middleware ───────────────────────────────────────────────────────────
origins = settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else [settings.CORS_ORIGINS]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


import uuid

# ── Request Logging & Security Headers Middleware ────────────────────────────
@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    start_time = time.time()
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    
    response = await call_next(request)
    duration_ms = round((time.time() - start_time) * 1000, 2)

    logger.info(
        f"[{request_id[:8]}] {request.method} {request.url.path} -> {response.status_code} ({duration_ms}ms)"
    )

    # Observability & Security Headers
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response


# ── Global Exception Handlers ─────────────────────────────────────────────────
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "detail": exc.detail,
            "error": {
                "code": exc.status_code,
                "message": exc.detail,
                "type": "HTTPException",
            },
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for err in exc.errors():
        loc = " -> ".join([str(item) for item in err.get("loc", [])])
        errors.append(f"{loc}: {err.get('msg')}")

    detail_msg = "; ".join(errors) or "Invalid payload data"
    logger.warning(f"Validation error on {request.url.path}: {detail_msg}")

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "detail": detail_msg,
            "error": {
                "code": 422,
                "message": detail_msg,
                "type": "ValidationError",
                "details": exc.errors(),
            },
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled server error on {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "detail": "An internal server error occurred.",
            "error": {
                "code": 500,
                "message": "Internal Server Error",
                "type": "ServerError",
            },
        },
    )


# ── Static Uploads ─────────────────────────────────────────────────────────────
uploads_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(uploads_path, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_path), name="uploads")

# ── Routers ────────────────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(files_router)
app.include_router(chat_router)
app.include_router(study_router)
app.include_router(analytics_router)


# ── Root & Health Endpoints ────────────────────────────────────────────────────
@app.get("/", tags=["Root"])
async def root():
    return {
        "name": "OmniVerse API",
        "status": "online",
        "environment": settings.ENVIRONMENT,
        "version": "1.0.0",
    }


@app.get("/health", tags=["Root"])
@app.get("/api/health", tags=["Root"])
async def health():
    db_status = "healthy"
    try:
        current_db = get_db()
        await current_db.command("ping")
    except Exception as err:
        db_status = f"unhealthy: {str(err)}"

    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "environment": settings.ENVIRONMENT,
        "database": db_status,
        "geminiConfigured": bool(settings.GEMINI_API_KEY),
    }

