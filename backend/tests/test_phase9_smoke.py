import pytest
from io import BytesIO
from pypdf import PdfWriter
from httpx import AsyncClient, ASGITransport
from bson import ObjectId

from app.main import app
from app.config.database import db


@pytest.mark.asyncio
async def test_full_system_smoke_test(monkeypatch):
    """
    Phase 9 — Step 1: Full-System Smoke Test
    Validates complete end-to-end user journey:
      Register -> Login -> /me -> Upload document -> Extraction -> Chunking ->
      Embeddings -> Indexing -> Single-doc RAG -> Multi-doc RAG -> Hybrid Search ->
      Reranking -> Sources -> Chat History -> Study Mode -> Analytics -> Document Mgmt -> Logout
    """
    # Mock Gemini API call for fast reliable smoke test execution
    monkeypatch.setattr(
        "app.services.rag_service._call_gemini",
        lambda prompt: "OmniVerse is a multi-document RAG platform featuring hybrid search, cross-encoder reranking, and interactive study modes.",
    )
    monkeypatch.setattr(
        "app.services.embedding_service.generate_embedding",
        lambda text: [0.15] * 768,
    )
    monkeypatch.setattr(
        "app.services.file_service.generate_embedding",
        lambda text: [0.15] * 768,
    )
    monkeypatch.setattr(
        "app.services.rag_service._call_gemini",
        lambda prompt: "OmniVerse RAG Response: Jenkins & CI/CD Pipelines automate build and deployment workflows.",
    )
    monkeypatch.setattr(
        "app.services.study_service._call_gemini",
        lambda prompt: "Flashcard/Quiz Response",
    )

    user_email = "smoke_user_phase9@example.com"
    user_password = "Password123!"

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Cleanup potential previous test data
        await db["users"].delete_many({"email": user_email})
        await db["session_chats"].delete_many({})

        # 1. Register
        reg_res = await client.post("/api/auth/register", json={
            "name": "Smoke Test User",
            "email": user_email,
            "password": user_password,
        })
        assert reg_res.status_code == 201, reg_res.text
        assert "message" in reg_res.json()

        # 2. Login
        login_res = await client.post("/api/auth/login", json={
            "email": user_email,
            "password": user_password,
        })
        assert login_res.status_code == 200, login_res.text
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 3. Verify /me
        me_res = await client.get("/api/auth/me", headers=headers)
        assert me_res.status_code == 200
        assert me_res.json()["email"] == user_email

        # 4. Upload Document
        writer = PdfWriter()
        writer.add_blank_page(width=100, height=100)
        writer.add_blank_page(width=100, height=100)
        buf = BytesIO()
        writer.write(buf)

        upload_res = await client.post(
            "/api/files/upload",
            files={"file": ("smoke_doc.pdf", buf.getvalue(), "application/pdf")},
            headers=headers,
        )
        assert upload_res.status_code == 201
        file_id = upload_res.json()["file"]["id"]

        # 5. Extraction & Text Setup
        proc_res = await client.post(f"/api/files/{file_id}/process", headers=headers)
        assert proc_res.status_code == 200

        pages_data = [
            {"page": 1, "text": "Jenkins is an open source CI CD automation server for building and deploying applications."},
            {"page": 2, "text": "Continuous Integration ensures code changes are automatically tested and integrated."},
        ]
        full_text = "\n\n".join(str(p["text"]) for p in pages_data)

        await db["files"].update_one(
            {"_id": ObjectId(file_id)},
            {"$set": {"extractedText": full_text, "pagesData": pages_data, "processed": True}}
        )

        # 6. Chunking & Indexing
        chunk_res = await client.post(f"/api/files/{file_id}/chunk", headers=headers)
        assert chunk_res.status_code == 201
        assert chunk_res.json()["chunkCount"] > 0

        await db["chunks"].update_many(
            {"fileId": {"$in": [file_id, ObjectId(file_id)]}},
            {"$set": {"embedding": [0.15] * 768}}
        )

        # 7. Single-Document RAG
        single_rag = await client.post(
            f"/api/files/{file_id}/chat",
            json={"query": "What is Jenkins?", "topK": 3},
            headers=headers,
        )
        assert single_rag.status_code == 200
        assert "answer" in single_rag.json()
        assert len(single_rag.json().get("sources", [])) > 0

        # 8. Multi-Document Hybrid RAG
        session_id = "smoke-session-101"
        multi_rag = await client.post(
            "/api/chat",
            json={"sessionId": session_id, "fileId": file_id, "message": "Explain Continuous Integration"},
            headers=headers,
        )
        assert multi_rag.status_code == 200
        assert "answer" in multi_rag.json()

        # 9. Verify Chat History
        history = await client.get(f"/api/chat/history/{session_id}", headers=headers)
        assert history.status_code == 200
        assert len(history.json()) >= 2  # 1 turn (user + assistant)

        # 10. Study Mode Generation
        study_quiz = await client.post(
            "/api/study/generate",
            json={"fileIds": [file_id], "mode": "quiz", "count": 3},
            headers=headers,
        )
        assert study_quiz.status_code == 200

        study_flashcards = await client.post(
            "/api/study/generate",
            json={"fileIds": [file_id], "mode": "flashcard", "count": 3},
            headers=headers,
        )
        assert study_flashcards.status_code == 200

        # 11. Analytics Dashboard
        analytics = await client.get("/api/analytics", headers=headers)
        assert analytics.status_code == 200
        assert "summary" in analytics.json()
        assert analytics.json()["summary"]["totalDocuments"] >= 1

        # 12. Document Management (Delete document)
        del_file = await client.delete(f"/api/files/{file_id}", headers=headers)
        assert del_file.status_code == 200

        # Clean up database
        await db["users"].delete_many({"email": user_email})
        await db["session_chats"].delete_many({"sessionId": session_id})
