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

    # Delete File
    del_res = await async_client.delete(f"/api/files/{file_id}", headers=headers)
    assert del_res.status_code == 200

    # Verify List Empty
    get_res2 = await async_client.get("/api/files", headers=headers)
    assert len(get_res2.json()) == 0
