import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.config.database import db
from bson import ObjectId


@pytest.mark.asyncio
async def test_full_phase5_e2e_pipeline():
    """
    End-to-End test suite for Phase 5 OmniVerse RAG Pipeline:
      1. Register User A & User B
      2. Authenticate & fetch /api/auth/me
      3. Upload PDF file
      4. Process, Chunk, & Embed document
      5. Perform User Isolation Vector Search
      6. Context-Aware RAG Chat (/api/chat)
      7. Verify Session Chat History
      8. Security (Unauthorized 401 checks)
      9. File type & input validation bounds
    """
    # ── 1. Register & Login User A ───────────────────────────────────────────
    user_a_data = {
        "name": "Phase5 UserA",
        "email": "usera_phase5@example.com",
        "password": "Password123!"
    }
    user_b_data = {
        "name": "Phase5 UserB",
        "email": "userb_phase5@example.com",
        "password": "Password123!"
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Cleanup prior test runs
        await db["users"].delete_many({"email": {"$in": [user_a_data["email"], user_b_data["email"]]}})
        await db["session_chats"].delete_many({})

        # Register User A
        reg_a = await client.post("/api/auth/register", json=user_a_data)
        assert reg_a.status_code == 201, reg_a.text

        # Login User A
        login_a = await client.post("/api/auth/login", json={"email": user_a_data["email"], "password": user_a_data["password"]})
        assert login_a.status_code == 200
        token_a = login_a.json()["access_token"]
        headers_a = {"Authorization": f"Bearer {token_a}"}

        # Verify /api/auth/me for User A
        me_a = await client.get("/api/auth/me", headers=headers_a)
        assert me_a.status_code == 200
        assert me_a.json()["email"] == user_a_data["email"]

        # Register & Login User B
        reg_b = await client.post("/api/auth/register", json=user_b_data)
        assert reg_b.status_code == 201
        login_b = await client.post("/api/auth/login", json={"email": user_b_data["email"], "password": user_b_data["password"]})
        token_b = login_b.json()["access_token"]
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # ── 2. Invalid File Upload Test ──────────────────────────────────────
        bad_upload = await client.post(
            "/api/files/upload",
            files={"file": ("malicious.exe", b"binary content", "application/x-msdownload")},
            headers=headers_a,
        )
        assert bad_upload.status_code == 400
        assert "Unsupported File Type" in bad_upload.json()["detail"]

        # ── 3. Valid PDF Upload for User A ───────────────────────────────────
        from io import BytesIO
        from pypdf import PdfWriter

        writer = PdfWriter()
        writer.add_blank_page(width=100, height=100)
        buf = BytesIO()
        writer.write(buf)

        upload_a = await client.post(
            "/api/files/upload",
            files={"file": ("test_doc_a.pdf", buf.getvalue(), "application/pdf")},
            headers=headers_a,
        )
        assert upload_a.status_code == 201
        file_a_id = upload_a.json()["file"]["id"]
        assert file_a_id

        # ── 4. Process, Chunk & Embed ────────────────────────────────────────
        proc = await client.post(f"/api/files/{file_a_id}/process", headers=headers_a)
        assert proc.status_code == 200

        # Set sample text on file so chunking succeeds
        sample_text = "OmniVerse RAG System test document text. Machine Learning is a branch of AI."
        await db["files"].update_one(
            {"_id": ObjectId(file_a_id)},
            {"$set": {"extractedText": sample_text, "processed": True}}
        )

        chunk_res = await client.post(f"/api/files/{file_a_id}/chunk", headers=headers_a)
        assert chunk_res.status_code == 201
        assert chunk_res.json()["chunkCount"] > 0

        # Insert dummy embeddings into chunks for fast vector test without calling external GenAI
        user_a_obj = await db["users"].find_one({"email": user_a_data["email"]})
        assert user_a_obj is not None
        user_a_id_str = str(user_a_obj["_id"])

        await db["chunks"].update_many(
            {"userId": {"$in": [user_a_id_str, user_a_obj["_id"]]}},
            {"$set": {"embedding": [0.1] * 768}}
        )

        # ── 5. User Isolation Test ───────────────────────────────────────────
        # User B should NOT be able to access User A's file
        b_access_a = await client.get(f"/api/files/{file_a_id}", headers=headers_b)
        assert b_access_a.status_code == 404

        # ── 6. Context-Aware RAG Chat (/api/chat) ────────────────────────────
        session_id = "phase5-test-session-1"

        # Save turn 1
        msg1 = await client.post(
            "/api/chat",
            json={"sessionId": session_id, "message": "Explain the first method."},
            headers=headers_a,
        )
        assert msg1.status_code == 200, f"Error: {msg1.status_code} - {msg1.text}"
        data1 = msg1.json()
        assert "answer" in data1
        assert data1["sessionId"] == session_id
        assert "sources" in data1

        # Save turn 2 (conversation memory)
        msg2 = await client.post(
            "/api/chat",
            json={"sessionId": session_id, "message": "What are its advantages?"},
            headers=headers_a,
        )
        assert msg2.status_code == 200
        assert "answer" in msg2.json()

        # ── 7. Verify Chat History ────────────────────────────────────────────
        history = await client.get(f"/api/chat/history/{session_id}", headers=headers_a)
        assert history.status_code == 200
        history_list = history.json()
        assert len(history_list) >= 4  # 2 user messages + 2 assistant responses

        # User B cannot access User A's session history
        history_b = await client.get(f"/api/chat/history/{session_id}", headers=headers_b)
        assert history_b.status_code == 200
        assert len(history_b.json()) == 0  # Empty for User B

        # ── 8. Unauthenticated Access ────────────────────────────────────────
        unauth_chat = await client.post(
            "/api/chat",
            json={"sessionId": session_id, "message": "Hello"}
        )
        assert unauth_chat.status_code == 401

        unauth_history = await client.get(f"/api/chat/history/{session_id}")
        assert unauth_history.status_code == 401

        # Clean up test users & documents
        await db["users"].delete_many({"email": {"$in": [user_a_data["email"], user_b_data["email"]]}})
        await db["files"].delete_many({"_id": ObjectId(file_a_id)})
        await db["chunks"].delete_many({"fileId": {"$in": [file_a_id, ObjectId(file_a_id)]}})
        await db["session_chats"].delete_many({"sessionId": session_id})
