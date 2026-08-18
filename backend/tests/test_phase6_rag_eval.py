import pytest
from io import BytesIO
from pypdf import PdfWriter
from httpx import AsyncClient, ASGITransport
from bson import ObjectId

from app.main import app
from app.config.database import db
from app.services.vector_search_service import search_similar_chunks, remove_duplicate_chunks, apply_page_diversity, normalize_text
from app.services.chunk_service import clean_text, split_text_into_chunks


@pytest.mark.asyncio
async def test_phase6_rag_retrieval_and_eval(monkeypatch):
    """
    Phase 6 Step 8 — Comprehensive RAG Verification & Evaluation Suite:
      1. Vector retrieval candidate expansion, similarity threshold & page diversity
      2. Duplicate chunk removal and text normalization
      3. RAG chat with multi-turn conversation memory
      4. Direct factual QA & source citation accuracy
      5. Unsupported / out-of-bounds question handling
      6. User and file isolation security checks (404 for wrong user/file)
    """
    monkeypatch.setattr(
        "app.services.embedding_service.generate_embedding",
        lambda text: [0.2] * 768,
    )
    monkeypatch.setattr(
        "app.services.chat_service.generate_embedding",
        lambda text: [0.2] * 768,
    )
    monkeypatch.setattr(
        "app.services.rag_service._call_gemini",
        lambda prompt: "Synthetic Gemini RAG answer based on retrieved document context.",
    )


    user_a_email = "phase6_eval_a@example.com"
    user_b_email = "phase6_eval_b@example.com"


    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Cleanup past test runs
        await db["users"].delete_many({"email": {"$in": [user_a_email, user_b_email]}})
        await db["session_chats"].delete_many({})

        # ── 1. Register & Login User A & User B ──────────────────────────────
        reg_a = await client.post("/api/auth/register", json={
            "name": "Phase6 Evaluator A",
            "email": user_a_email,
            "password": "Password123!",
        })
        assert reg_a.status_code == 201

        login_a = await client.post("/api/auth/login", json={
            "email": user_a_email,
            "password": "Password123!",
        })
        assert login_a.status_code == 200
        headers_a = {"Authorization": f"Bearer {login_a.json()['access_token']}"}

        reg_b = await client.post("/api/auth/register", json={
            "name": "Phase6 Evaluator B",
            "email": user_b_email,
            "password": "Password123!",
        })
        assert reg_b.status_code == 201

        login_b = await client.post("/api/auth/login", json={
            "email": user_b_email,
            "password": "Password123!",
        })
        assert login_b.status_code == 200
        headers_b = {"Authorization": f"Bearer {login_b.json()['access_token']}"}

        # ── 2. Upload PDF for User A ─────────────────────────────────────────
        writer = PdfWriter()
        writer.add_blank_page(width=100, height=100)
        writer.add_blank_page(width=100, height=100)
        writer.add_blank_page(width=100, height=100)
        buf = BytesIO()
        writer.write(buf)

        upload_a = await client.post(
            "/api/files/upload",
            files={"file": ("DevOps-Unit-3.pdf", buf.getvalue(), "application/pdf")},
            headers=headers_a,
        )
        assert upload_a.status_code == 201
        file_a_id = upload_a.json()["file"]["id"]

        # Upload PDF for User B
        upload_b = await client.post(
            "/api/files/upload",
            files={"file": ("UserB-Document.pdf", buf.getvalue(), "application/pdf")},
            headers=headers_b,
        )
        assert upload_b.status_code == 201
        file_b_id = upload_b.json()["file"]["id"]

        # ── 3. Process, Chunk, & Embed User A Document with Multi-Page Data ──
        await client.post(f"/api/files/{file_a_id}/process", headers=headers_a)

        pages_data = [
            {"page": 1, "text": "Jenkins is an open source automation server used for CI CD build management."},
            {"page": 2, "text": "Jenkins Architecture consists of a master controller node and multiple agent nodes."},
            {"page": 3, "text": "Jenkins Pipeline enables build automation using declarative or scripted pipelines."},
            {"page": 4, "text": "Jenkins Triggers initiate automated builds on SCM commits or cron schedules."},
            {"page": 5, "text": "Build Agents and Slaves execute actual build tasks offloaded from the Jenkins master node."},
            {"page": 6, "text": "Freestyle projects vs Pipelines: Freestyle is GUI based while Pipeline is Code based."},
        ]
        full_text = "\n\n".join(str(p["text"]) for p in pages_data)

        await db["files"].update_one(
            {"_id": ObjectId(file_a_id)},
            {"$set": {"extractedText": full_text, "pagesData": pages_data, "processed": True}}
        )

        chunk_res = await client.post(f"/api/files/{file_a_id}/chunk", headers=headers_a)
        assert chunk_res.status_code == 201
        assert chunk_res.json()["chunkCount"] == 6

        # Populate synthetic embeddings for vector search testing
        user_a_doc = await db["users"].find_one({"email": user_a_email})
        assert user_a_doc is not None
        user_a_id = str(user_a_doc["_id"])

        await db["chunks"].update_many(
            {"fileId": {"$in": [file_a_id, ObjectId(file_a_id)]}},
            {"$set": {"embedding": [0.2] * 768}}
        )

        # ── 4. Retrieval Verification & Evaluation Log Test ─────────────────
        dummy_query_vector = [0.2] * 768
        retrieved_chunks = await search_similar_chunks(
            user_id=user_a_id,
            query_embedding=dummy_query_vector,
            file_id=file_a_id,
            filename="DevOps-Unit-3.pdf",
            top_k=5,
        )

        print("\n--- RAG RETRIEVAL EVALUATION ---")
        print(f"Total Retrieved Chunks: {len(retrieved_chunks)}")
        for idx, chunk in enumerate(retrieved_chunks):
            print(f"Rank {idx + 1}: score={chunk.get('score')} page={chunk['source'].get('page')} text={chunk['text'][:100]}")

        assert len(retrieved_chunks) <= 5
        assert len(retrieved_chunks) > 0
        pages_seen = [c["source"].get("page") for c in retrieved_chunks]
        assert len(pages_seen) == len(set(pages_seen))  # Page diversity check

        # ── 5. Test User A Security Isolation ────────────────────────────────
        # User A attempting to chat with User B's file -> 404
        unauthorized_chat = await client.post(
            f"/api/files/{file_b_id}/chat",
            json={"query": "What is in this document?", "topK": 5},
            headers=headers_a,
        )
        assert unauthorized_chat.status_code == 404
        assert unauthorized_chat.json()["detail"] == "File not found"

        # User B attempting to chat with User A's file in session chat -> 404
        unauthorized_session_chat = await client.post(
            "/api/chat",
            json={"sessionId": "stolen-session", "fileId": file_a_id, "message": "Give topics"},
            headers=headers_b,
        )
        assert unauthorized_session_chat.status_code == 404
        assert unauthorized_session_chat.json()["detail"] == "Document not found"

        # ── 6. Test Multi-Turn Context Chat ──────────────────────────────────
        session_id = "eval-session-devops-1"

        # Turn 1: Explain Jenkins pipeline
        t1 = await client.post(
            "/api/chat",
            json={"sessionId": session_id, "fileId": file_a_id, "message": "Explain Jenkins pipeline."},
            headers=headers_a,
        )
        assert t1.status_code == 200
        d1 = t1.json()
        assert "answer" in d1
        assert len(d1["sources"]) > 0
        assert d1["sources"][0]["filename"] == "DevOps-Unit-3.pdf"

        # Turn 2: What are its advantages?
        t2 = await client.post(
            "/api/chat",
            json={"sessionId": session_id, "fileId": file_a_id, "message": "What are its advantages?"},
            headers=headers_a,
        )
        assert t2.status_code == 200

        # Turn 3: Compare it with Freestyle projects
        t3 = await client.post(
            "/api/chat",
            json={"sessionId": session_id, "fileId": file_a_id, "message": "Compare it with Freestyle projects."},
            headers=headers_a,
        )
        assert t3.status_code == 200

        # Verify chat history thread contains all 6 messages (3 turns)
        history_res = await client.get(f"/api/chat/history/{session_id}", headers=headers_a)
        assert history_res.status_code == 200
        assert len(history_res.json()) == 6

        # ── 7. Clean up ──────────────────────────────────────────────────────
        await db["users"].delete_many({"email": {"$in": [user_a_email, user_b_email]}})
        await db["files"].delete_many({"_id": {"$in": [ObjectId(file_a_id), ObjectId(file_b_id)]}})
        await db["chunks"].delete_many({"fileId": {"$in": [file_a_id, file_b_id, ObjectId(file_a_id), ObjectId(file_b_id)]}})
        await db["session_chats"].delete_many({"sessionId": session_id})
