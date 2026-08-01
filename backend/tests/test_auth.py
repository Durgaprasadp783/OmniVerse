async def test_register_user_success(async_client):
    response = await async_client.post(
        "/api/auth/register",
        json={
            "name": "Durga Prasad",
            "email": "durga@example.com",
            "password": "StrongPassword123!",
        },
    )
    assert response.status_code == 201
    assert response.json() == {"message": "User created successfully"}


async def test_register_duplicate_email(async_client):
    user_payload = {
        "name": "Durga Prasad",
        "email": "durga@example.com",
        "password": "StrongPassword123!",
    }
    # First registration
    res1 = await async_client.post("/api/auth/register", json=user_payload)
    assert res1.status_code == 201

    # Second registration with same email
    res2 = await async_client.post("/api/auth/register", json=user_payload)
    assert res2.status_code == 409
    assert res2.json()["detail"] == "An account with this email already exists"


async def test_login_success(async_client):
    # Register user first
    await async_client.post(
        "/api/auth/register",
        json={
            "name": "Durga Prasad",
            "email": "durga@example.com",
            "password": "StrongPassword123!",
        },
    )

    # Login
    response = await async_client.post(
        "/api/auth/login",
        json={
            "email": "durga@example.com",
            "password": "StrongPassword123!",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


async def test_login_invalid_credentials(async_client):
    # Register user
    await async_client.post(
        "/api/auth/register",
        json={
            "name": "Durga Prasad",
            "email": "durga@example.com",
            "password": "StrongPassword123!",
        },
    )

    # Login with wrong password
    response = await async_client.post(
        "/api/auth/login",
        json={
            "email": "durga@example.com",
            "password": "WrongPassword123!",
        },
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"


async def test_get_me_success(async_client):
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

    # Call /me endpoint with Bearer token
    response = await async_client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    user_data = response.json()
    assert user_data["name"] == "Durga Prasad"
    assert user_data["email"] == "durga@example.com"
    assert "id" in user_data


async def test_get_me_unauthorized(async_client):
    response = await async_client.get("/api/auth/me")
    assert response.status_code == 401


async def test_logout_success(async_client):
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

    # Call /logout endpoint with Bearer token
    response = await async_client.post(
        "/api/auth/logout",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json() == {"message": "Logged out successfully"}
