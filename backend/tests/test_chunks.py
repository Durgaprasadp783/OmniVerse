import pytest
from io import BytesIO
from pypdf import PdfWriter
from app.services.chunk_service import clean_text, split_text_into_chunks
from app.config.database import chunks_collection


def test_clean_text():
    raw = "Hello \t world!\r\n\r\nThis is   a test.\n\n\n\nEnd."
    cleaned = clean_text(raw)
    assert cleaned == "Hello world!\nThis is a test.\nEnd."


def test_split_text_into_chunks_basic():
    text = "Short text under default limit."
    chunks = split_text_into_chunks(text)
    assert len(chunks) == 1
    assert chunks[0] == text


def test_split_text_into_chunks_overlap_error():
    with pytest.raises(ValueError, match="Chunk overlap must be smaller than chunk size"):
        split_text_into_chunks("Sample text", chunk_size=100, overlap=100)


def test_split_text_into_chunks_large():
    sentence = "This is a long sentence used for chunking testing. " * 30  # ~300 words
    chunks = split_text_into_chunks(sentence, chunk_size=50, overlap=10)
    assert len(chunks) > 1
    for chunk in chunks:
        assert len(chunk.split()) <= 50



@pytest.mark.asyncio
async def test_chunk_file_endpoint(async_client):
    # 1. Register & Login
    await async_client.post(
        "/api/auth/register",
        json={
            "name": "Chunk Tester",
            "email": "chunktester@example.com",
            "password": "StrongPassword123!",
        },
    )
    login_res = await async_client.post(
        "/api/auth/login",
        json={
            "email": "chunktester@example.com",
            "password": "StrongPassword123!",
        },
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Upload valid PDF
    writer = PdfWriter()
    writer.add_blank_page(width=100, height=100)
    buf = BytesIO()
    writer.write(buf)

    upload_res = await async_client.post(
        "/api/files/upload",
        headers=headers,
        files={"file": ("chunk_doc.pdf", buf.getvalue(), "application/pdf")},
    )
    file_id = upload_res.json()["file"]["id"]

    # 3. Attempt chunking before processing -> expect 400
    chunk_before_process = await async_client.post(
        f"/api/files/{file_id}/chunk",
        headers=headers,
    )
    assert chunk_before_process.status_code == 400
    assert "File must be processed before chunking" in chunk_before_process.json()["detail"]

    # 4. Process file
    process_res = await async_client.post(
        f"/api/files/{file_id}/process",
        headers=headers,
    )
    assert process_res.status_code == 200

    # Manually populate extractedText for testing chunking if blank page had no text
    from app.config.database import files_collection
    from bson import ObjectId

    sample_long_text = ("OmniVerse is a modular AI platform. " * 40) + "\n\n" + ("Second paragraph with detailed context. " * 30)
    await files_collection.update_one(
        {"_id": ObjectId(file_id)},
        {"$set": {"extractedText": sample_long_text}},
    )

    # 5. Chunk file -> expect 201
    chunk_res = await async_client.post(
        f"/api/files/{file_id}/chunk",
        headers=headers,
    )
    assert chunk_res.status_code == 201
    c_data = chunk_res.json()
    assert c_data["success"] is True
    assert c_data["message"] == "Document chunked successfully"
    assert c_data["fileId"] == file_id
    assert c_data["chunkCount"] > 0
    first_count = c_data["chunkCount"]

    # 6. Re-chunk file -> verify duplicates deleted
    rechunk_res = await async_client.post(
        f"/api/files/{file_id}/chunk",
        headers=headers,
    )
    assert rechunk_res.status_code == 201
    assert rechunk_res.json()["chunkCount"] == first_count


@pytest.mark.asyncio
async def test_embed_file_endpoint(async_client, monkeypatch):
    # 1. Register & Login
    await async_client.post(
        "/api/auth/register",
        json={
            "name": "Embed Tester",
            "email": "embedtester@example.com",
            "password": "StrongPassword123!",
        },
    )
    login_res = await async_client.post(
        "/api/auth/login",
        json={
            "email": "embedtester@example.com",
            "password": "StrongPassword123!",
        },
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Upload valid PDF
    writer = PdfWriter()
    writer.add_blank_page(width=100, height=100)
    buf = BytesIO()
    writer.write(buf)

    upload_res = await async_client.post(
        "/api/files/upload",
        headers=headers,
        files={"file": ("embed_doc.pdf", buf.getvalue(), "application/pdf")},
    )
    file_id = upload_res.json()["file"]["id"]

    # 3. Attempt embed before chunking -> expect 400
    embed_before_chunk = await async_client.post(
        f"/api/files/{file_id}/embed",
        headers=headers,
    )
    assert embed_before_chunk.status_code == 400
    assert "No chunks found" in embed_before_chunk.json()["detail"]

    # 4. Process & Chunk file
    await async_client.post(f"/api/files/{file_id}/process", headers=headers)

    from app.config.database import files_collection
    from bson import ObjectId

    await files_collection.update_one(
        {"_id": ObjectId(file_id)},
        {"$set": {"extractedText": "Sample text for embedding test."}},
    )

    await async_client.post(f"/api/files/{file_id}/chunk", headers=headers)

    # Mock generate_embedding to return dummy vector
    fake_vector = [0.123, -0.456, 0.789]
    monkeypatch.setattr(
        "app.services.file_service.generate_embedding",
        lambda text: fake_vector,
    )

    # 5. Embed file -> expect 200
    embed_res = await async_client.post(
        f"/api/files/{file_id}/embed",
        headers=headers,
    )
    assert embed_res.status_code == 200
    e_data = embed_res.json()
    assert e_data["success"] is True
    assert e_data["message"] == "Embeddings generated successfully"
    assert e_data["fileId"] == file_id
    assert e_data["chunksProcessed"] == 1

    # Verify chunk in DB has embedding
    chunk_doc = await chunks_collection.find_one({"fileId": ObjectId(file_id)})
    assert chunk_doc is not None
    assert chunk_doc["embedding"] == fake_vector


def test_cosine_similarity():
    from app.services.vector_search_service import cosine_similarity

    # Identical vectors -> similarity 1.0
    assert abs(cosine_similarity([1.0, 2.0, 3.0], [1.0, 2.0, 3.0]) - 1.0) < 1e-5

    # Orthogonal vectors -> similarity 0.0
    assert abs(cosine_similarity([1.0, 0.0], [0.0, 1.0])) < 1e-5

    # Mismatched length or empty -> 0.0
    assert cosine_similarity([1.0, 2.0], [1.0]) == 0.0
    assert cosine_similarity([], [1.0, 2.0]) == 0.0


@pytest.mark.asyncio
async def test_search_file_endpoint(async_client, monkeypatch):
    # 1. Register & Login User A
    await async_client.post(
        "/api/auth/register",
        json={
            "name": "Search Tester A",
            "email": "searcha@example.com",
            "password": "StrongPassword123!",
        },
    )
    login_a = await async_client.post(
        "/api/auth/login",
        json={
            "email": "searcha@example.com",
            "password": "StrongPassword123!",
        },
    )
    headers_a = {"Authorization": f"Bearer {login_a.json()['access_token']}"}

    # 2. Register & Login User B
    await async_client.post(
        "/api/auth/register",
        json={
            "name": "Search Tester B",
            "email": "searchb@example.com",
            "password": "StrongPassword123!",
        },
    )
    login_b = await async_client.post(
        "/api/auth/login",
        json={
            "email": "searchb@example.com",
            "password": "StrongPassword123!",
        },
    )
    headers_b = {"Authorization": f"Bearer {login_b.json()['access_token']}"}

    # 3. User A uploads, processes, chunks & embeds a file
    writer = PdfWriter()
    writer.add_blank_page(width=100, height=100)
    buf = BytesIO()
    writer.write(buf)

    upload_res = await async_client.post(
        "/api/files/upload",
        headers=headers_a,
        files={"file": ("search_doc.pdf", buf.getvalue(), "application/pdf")},
    )
    file_id_a = upload_res.json()["file"]["id"]

    await async_client.post(f"/api/files/{file_id_a}/process", headers=headers_a)

    from app.config.database import files_collection
    from bson import ObjectId

    await files_collection.update_one(
        {"_id": ObjectId(file_id_a)},
        {"$set": {"extractedText": "Machine learning is a subset of artificial intelligence focusing on neural networks."}},
    )

    await async_client.post(f"/api/files/{file_id_a}/chunk", headers=headers_a)

    # Mock embeddings: return static vector for text
    monkeypatch.setattr(
        "app.services.file_service.generate_embedding",
        lambda text: [0.5, 0.5, 0.5],
    )

    await async_client.post(f"/api/files/{file_id_a}/embed", headers=headers_a)

    # 4. User A performs vector search
    search_res = await async_client.post(
        f"/api/files/{file_id_a}/search",
        headers=headers_a,
        json={"query": "What is machine learning?", "topK": 5},
    )
    assert search_res.status_code == 200
    s_data = search_res.json()
    assert s_data["success"] is True
    assert s_data["query"] == "What is machine learning?"
    assert len(s_data["results"]) == 1
    assert "Machine learning" in s_data["results"][0]["text"]
    assert s_data["results"][0]["score"] > 0.9

    # 5. Security check: User B attempts to search User A's file -> expect 404
    sec_check = await async_client.post(
        f"/api/files/{file_id_a}/search",
        headers=headers_b,
        json={"query": "What is machine learning?", "topK": 5},
    )
    assert sec_check.status_code == 404


def test_generate_rag_answer_unit():
    from app.services.rag_service import generate_rag_answer

    with pytest.raises(ValueError, match="Question is required"):
        generate_rag_answer("", [])

    res_empty = generate_rag_answer("What is AI?", [])
    assert res_empty["answer"] == "I could not find relevant information in the document."
    assert res_empty["sources"] == []


@pytest.mark.asyncio
async def test_chat_file_endpoint(async_client, monkeypatch):
    # 1. Register & Login User A
    await async_client.post(
        "/api/auth/register",
        json={
            "name": "RAG Tester A",
            "email": "raga@example.com",
            "password": "StrongPassword123!",
        },
    )
    login_a = await async_client.post(
        "/api/auth/login",
        json={
            "email": "raga@example.com",
            "password": "StrongPassword123!",
        },
    )
    headers_a = {"Authorization": f"Bearer {login_a.json()['access_token']}"}

    # 2. Register & Login User B
    await async_client.post(
        "/api/auth/register",
        json={
            "name": "RAG Tester B",
            "email": "ragb@example.com",
            "password": "StrongPassword123!",
        },
    )
    login_b = await async_client.post(
        "/api/auth/login",
        json={
            "email": "ragb@example.com",
            "password": "StrongPassword123!",
        },
    )
    headers_b = {"Authorization": f"Bearer {login_b.json()['access_token']}"}

    # 3. User A uploads, processes, chunks & embeds a file
    writer = PdfWriter()
    writer.add_blank_page(width=100, height=100)
    buf = BytesIO()
    writer.write(buf)

    upload_res = await async_client.post(
        "/api/files/upload",
        headers=headers_a,
        files={"file": ("rag_doc.pdf", buf.getvalue(), "application/pdf")},
    )
    file_id_a = upload_res.json()["file"]["id"]

    await async_client.post(f"/api/files/{file_id_a}/process", headers=headers_a)

    from app.config.database import files_collection
    from bson import ObjectId

    await files_collection.update_one(
        {"_id": ObjectId(file_id_a)},
        {"$set": {"extractedText": "OmniVerse is a unified multimodal platform."}},
    )

    await async_client.post(f"/api/files/{file_id_a}/chunk", headers=headers_a)

    # Mock embeddings and RAG generation
    monkeypatch.setattr(
        "app.services.file_service.generate_embedding",
        lambda text: [0.2, 0.4, 0.6],
    )
    monkeypatch.setattr(
        "app.services.file_service.generate_rag_answer",
        lambda question, chunks: {
            "answer": "OmniVerse is a unified multimodal platform based on [Source 1].",
            "sources": [
                {
                    "source": 1,
                    "chunkId": str(chunks[0]["_id"]),
                    "chunkIndex": chunks[0]["chunkIndex"],
                    "score": 1.0,
                }
            ],
        },
    )

    await async_client.post(f"/api/files/{file_id_a}/embed", headers=headers_a)

    # 4. User A chats with file
    chat_res = await async_client.post(
        f"/api/files/{file_id_a}/chat",
        headers=headers_a,
        json={"query": "What is OmniVerse?", "topK": 5},
    )
    assert chat_res.status_code == 200
    c_data = chat_res.json()
    assert c_data["success"] is True
    assert c_data["query"] == "What is OmniVerse?"
    assert "multimodal platform" in c_data["answer"]
    assert len(c_data["sources"]) == 1
    assert c_data["sources"][0]["source"] == 1

    # 5. Security check: User B attempts to chat with User A's file -> expect 404
    sec_chat = await async_client.post(
        f"/api/files/{file_id_a}/chat",
        headers=headers_b,
        json={"query": "What is OmniVerse?", "topK": 5},
    )
    assert sec_chat.status_code == 404

    # 6. Check Chat History for User A
    history_res = await async_client.get(
        f"/api/files/{file_id_a}/chat/history",
        headers=headers_a,
    )
    assert history_res.status_code == 200
    h_data = history_res.json()
    assert len(h_data) == 2
    assert h_data[0]["role"] == "user"
    assert h_data[0]["content"] == "What is OmniVerse?"
    assert h_data[1]["role"] == "assistant"
    assert "multimodal platform" in h_data[1]["content"]

    # 7. Security check: User B attempting to view User A's history returns empty []
    sec_history = await async_client.get(
        f"/api/files/{file_id_a}/chat/history",
        headers=headers_b,
    )
    assert sec_history.status_code == 200
    assert len(sec_history.json()) == 0

    # 8. Clear Chat History for User A
    clear_res = await async_client.delete(
        f"/api/files/{file_id_a}/chat/history",
        headers=headers_a,
    )
    assert clear_res.status_code == 200
    assert clear_res.json()["message"] == "Chat history cleared"

    # Verify history empty
    post_clear_hist = await async_client.get(
        f"/api/files/{file_id_a}/chat/history",
        headers=headers_a,
    )
    assert len(post_clear_hist.json()) == 0


def test_normalize_text():
    from app.services.vector_search_service import normalize_text

    assert normalize_text("  Jenkins   is a   CI tool.  ") == "jenkins is a ci tool."
    assert normalize_text("JENKINS\n\nis\ta CI  tool.") == "jenkins is a ci tool."
    assert normalize_text("") == ""
    assert normalize_text(None) == ""


def test_remove_duplicate_chunks():
    from app.services.vector_search_service import remove_duplicate_chunks

    chunks = [
        {"_id": "1", "text": "Jenkins is a CI tool.", "score": 0.549},
        {"_id": "2", "text": "Jenkins   is a CI tool.", "score": 0.549},  # Duplicate text (whitespace)
        {"_id": "1", "text": "Different text with duplicate ID", "score": 0.547},  # Duplicate ID
        {"_id": "3", "text": "Jenkins architecture is master-worker.", "score": 0.542},
        {"_id": "4", "text": "Jenkins pipelines automate builds.", "score": 0.539},
    ]

    unique = remove_duplicate_chunks(chunks)

    assert len(unique) == 3
    assert unique[0]["_id"] == "1"
    assert unique[1]["_id"] == "3"
    assert unique[2]["_id"] == "4"





