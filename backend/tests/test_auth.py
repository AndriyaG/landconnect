from tests.conftest import register


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_register_returns_token_and_public_user(client):
    r = register(client, role="seller")
    assert r.status_code == 201
    body = r.json()
    assert body["access_token"]
    assert body["user"] == {"id": body["user"]["id"], "name": "Alice", "role": "seller"}


def test_register_hides_email_and_password(client):
    text = register(client).text
    assert "a@example.com" not in text
    assert "password" not in text.replace("password_hash", "")


def test_register_duplicate_email_case_insensitive(client):
    register(client)
    assert register(client, email="A@Example.com").status_code == 409


def test_register_rejects_admin_role(client):
    assert register(client, role="admin").status_code == 422


def test_register_rejects_short_password(client):
    assert register(client, password="short").status_code == 422


def test_login_success(client):
    register(client)
    r = client.post("/auth/login", json={"email": "a@example.com", "password": "password123"})
    assert r.status_code == 200
    assert r.json()["user"]["name"] == "Alice"


def test_login_wrong_password(client):
    register(client)
    r = client.post("/auth/login", json={"email": "a@example.com", "password": "wrongpass1"})
    assert r.status_code == 401


def test_login_unknown_email(client):
    r = client.post("/auth/login", json={"email": "nobody@example.com", "password": "password123"})
    assert r.status_code == 401
