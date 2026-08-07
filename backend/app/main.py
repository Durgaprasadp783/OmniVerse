import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.auth import router as auth_router
from app.api.files import router as files_router

app = FastAPI(
    title="OmniVerse API",
    description="Production-ready backend for OmniVerse",
    version="1.0.0",
)

# ── CORS ───────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static Uploads ─────────────────────────────────────────────────────────────
uploads_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(uploads_path, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_path), name="uploads")

# ── Routers ────────────────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(files_router)


# ── Root Endpoints ─────────────────────────────────────────────────────────────
@app.get("/", tags=["Root"])
async def root():
    return {"message": "Welcome to OmniVerse 🚀"}


@app.get("/health", tags=["Root"])
async def health():
    return {"status": "running"}
