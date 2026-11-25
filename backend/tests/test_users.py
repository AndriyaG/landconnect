from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from app.deps import require_role
from app.models import Role, User
from app.schemas.user import PublicUser
from tests.conftest import auth, register


def _token(client, **kw) -> str:
    return register(client, **kw).json()["access_token"]


def test_me_requires_auth(client):
    assert client.get("/me").status_code == 401


def test_me_returns_own_private_fields(client):
    r = client.get("/me", headers=auth(_token(client)))
    assert r.status_code == 200
    body = r.json()
    assert body == {"id": body["id"], "name": "Alice", "role": "buyer", "email": "a@example.com", "call_privacy": "everyone"}


def test_patch_me_updates_name_and_call_privacy(client):
    h = auth(_token(client))
    r = client.patch("/me", json={"name": " Alicia ", "call_privacy": "contacts"}, headers=h)
    assert r.status_code == 200
    assert r.json()["name"] == "Alicia"
    assert r.json()["call_privacy"] == "contacts"
    assert client.get("/me", headers=h).json()["call_privacy"] == "contacts"


def test_patch_me_rejects_invalid_privacy_and_other_fields(client):
    h = auth(_token(client))
    assert client.patch("/me", json={"call_privacy": "nobody"}, headers=h).status_code == 422
    assert client.patch("/me", json={"role": "seller"}, headers=h).status_code == 422
    assert client.patch("/me", json={"email": "x@example.com"}, headers=h).status_code == 422
    assert client.get("/me", headers=h).json()["role"] == "buyer"


def test_public_user_hides_private_fields(client):
    target = register(client, email="bob@example.com", name="Bob", role="seller").json()["user"]["id"]
    r = client.get(f"/users/{target}/public", headers=auth(_token(client)))
    assert r.status_code == 200
    assert r.json() == {"id": target, "name": "Bob", "role": "seller"}
    assert "bob@example.com" not in r.text
    assert "password" not in r.text
    assert "call_privacy" not in r.text


def test_public_user_requires_auth_and_404s(client):
    assert client.get("/users/1/public").status_code == 401
    assert client.get("/users/9999/public", headers=auth(_token(client))).status_code == 404


def test_public_schema_never_has_email_or_password_hash():
    assert set(PublicUser.model_fields) == {"id", "name", "role"}
    user = User(id=1, name="A", email="a@example.com", password_hash="hash", role=Role.buyer)
    dumped = PublicUser.model_validate(user).model_dump()
    assert "email" not in dumped and "password_hash" not in dumped


def test_require_role_rejects_wrong_role(client):
    guarded = FastAPI()

    @guarded.get("/sellers-only")
    def sellers_only(user: User = Depends(require_role(Role.seller, Role.broker))):
        return {"id": user.id}

    gc = TestClient(guarded)
    buyer = _token(client, email="buyer@example.com", role="buyer")
    seller = _token(client, email="seller@example.com", role="seller")
    assert gc.get("/sellers-only").status_code == 401
    assert gc.get("/sellers-only", headers=auth(buyer)).status_code == 403
    assert gc.get("/sellers-only", headers=auth(seller)).status_code == 200
