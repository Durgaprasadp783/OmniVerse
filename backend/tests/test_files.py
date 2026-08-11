import pytest


@pytest.mark.asyncio
async def test_file_upload_and_delete(async_client):
    # Register & Login
    await async_client.post(
        "/api/auth/register",
        json={
            "name": "Durga Prasad",
            "email": "durga@example.com",
            "password": "StrongPassword123!",
        },
    )
    login_res = await async_client.post(
        "/api/auth/login",
        json={
            "email": "durga@example.com",
            "password": "StrongPassword123!",
        },
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Upload PDF file
    files = {
        "file": ("test_doc.pdf", b"%PDF-1.4 sample content", "application/pdf")
    }
    res = await async_client.post(
        "/api/files/upload",
        headers=headers,
        files=files,
    )
    assert res.status_code == 201
    payload = res.json()
    assert payload["success"] is True
    assert payload["message"] == "File uploaded successfully"
    file_data = payload["file"]
    assert file_data["originalName"] == "test_doc.pdf"
    assert file_data["fileType"] == "application/pdf"
    file_id = file_data["id"]

    # Get User Files
    get_res = await async_client.get("/api/files", headers=headers)
    assert get_res.status_code == 200
    user_files = get_res.json()
    assert len(user_files) == 1
    assert user_files[0]["id"] == file_id

    # Get File By ID
    get_by_id_res = await async_client.get(f"/api/files/{file_id}", headers=headers)
    assert get_by_id_res.status_code == 200
    single_file = get_by_id_res.json()
    assert single_file["id"] == file_id
    assert single_file["originalName"] == "test_doc.pdf"

    # Security check: User B attempting to access User A's file -> 404
    await async_client.post(
        "/api/auth/register",
        json={
            "name": "User B",
            "email": "userb@example.com",
            "password": "StrongPassword123!",
        },
    )
    login_b = await async_client.post(
        "/api/auth/login",
        json={
            "email": "userb@example.com",
            "password": "StrongPassword123!",
        },
    )
    headers_b = {"Authorization": f"Bearer {login_b.json()['access_token']}"}

    sec_res = await async_client.get(f"/api/files/{file_id}", headers=headers_b)
    assert sec_res.status_code == 404


    # Delete File
    del_res = await async_client.delete(f"/api/files/{file_id}", headers=headers)
    assert del_res.status_code == 200

    # Verify List Empty
    get_res2 = await async_client.get("/api/files", headers=headers)
    assert len(get_res2.json()) == 0


@pytest.mark.asyncio
async def test_pdf_process(async_client):
    from io import BytesIO
    from pypdf import PdfWriter

    # Register & Login
    await async_client.post(
        "/api/auth/register",
        json={
            "name": "Process Tester",
            "email": "processtester@example.com",
            "password": "StrongPassword123!",
        },
    )
    login_res = await async_client.post(
        "/api/auth/login",
        json={
            "email": "processtester@example.com",
            "password": "StrongPassword123!",
        },
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Generate a valid 1-page PDF
    writer = PdfWriter()
    writer.add_blank_page(width=100, height=100)
    buf = BytesIO()
    writer.write(buf)
    valid_pdf_bytes = buf.getvalue()

    # Upload valid PDF
    upload_res = await async_client.post(
        "/api/files/upload",
        headers=headers,
        files={"file": ("sample.pdf", valid_pdf_bytes, "application/pdf")},
    )
    assert upload_res.status_code == 201
    file_id = upload_res.json()["file"]["id"]

    # Process PDF
    process_res = await async_client.post(
        f"/api/files/{file_id}/process",
        headers=headers,
    )
    assert process_res.status_code == 200
    p_data = process_res.json()
    assert p_data["success"] is True
    assert p_data["message"] == "PDF processed and text saved successfully"
    assert p_data["file"]["id"] == file_id
    assert p_data["file"]["originalName"] == "sample.pdf"
    assert p_data["file"]["pages"] == 1
    assert p_data["file"]["processed"] is True

    # Check updated user files list
    user_files_res = await async_client.get("/api/files", headers=headers)
    assert user_files_res.status_code == 200
    files_list = user_files_res.json()
    processed_doc = next(f for f in files_list if f["id"] == file_id)
    assert processed_doc["processed"] is True
    assert processed_doc["pageCount"] == 1


    # Non-PDF check
    upload_img = await async_client.post(
        "/api/files/upload",
        headers=headers,
        files={"file": ("sample.png", b"fake png data", "image/png")},
    )
    img_id = upload_img.json()["file"]["id"]
    process_img_res = await async_client.post(
        f"/api/files/{img_id}/process",
        headers=headers,
    )
    assert process_img_res.status_code == 400
    assert "Only PDF files are supported" in process_img_res.json()["detail"]

