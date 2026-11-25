import io

from PIL import Image

from tests.conftest import auth, register


def _token(client, email, role):
    return register(client, email=email, role=role, name=email.split("@")[0]).json()["access_token"]


def _listing(**overrides):
    body = {
        "title": "Plot in Whitefield", "description": "Clear title", "price": 5000000,
        "area_value": 1200, "area_unit": "sqft", "land_type": "residential",
        "lat": 12.97, "lng": 77.75, "address": "Whitefield, Bengaluru",
    }
    return body | overrides


def _create(client, token, **overrides):
    r = client.post("/listings", json=_listing(**overrides), headers=auth(token))
    assert r.status_code == 201, r.text
    return r.json()


def _png(size=(2400, 1200)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", size, "green").save(buf, format="PNG")
    return buf.getvalue()


def test_buyer_cannot_create_listing(client):
    buyer = _token(client, "buyer@example.com", "buyer")
    assert client.post("/listings", json=_listing(), headers=auth(buyer)).status_code == 403
    assert client.post("/listings", json=_listing()).status_code == 401
    assert client.get("/listings").json() == []


def test_seller_and_broker_create_with_public_owner_only(client):
    seller = _token(client, "seller@example.com", "seller")
    broker = _token(client, "broker@example.com", "broker")
    created = _create(client, seller)
    _create(client, broker, title="Broker plot")
    assert created["owner"] == {"id": created["owner"]["id"], "name": "seller", "role": "seller"}
    assert created["status"] == "active" and created["images"] == []
    r = client.get(f"/listings/{created['id']}")
    assert r.status_code == 200
    assert "seller@example.com" not in r.text and "password" not in r.text
    assert "@example.com" not in client.get("/listings").text


def test_only_owner_can_edit_or_delete(client):
    owner = _token(client, "owner@example.com", "seller")
    other = _token(client, "other@example.com", "broker")
    buyer = _token(client, "buyer@example.com", "buyer")
    lid = _create(client, owner)["id"]
    update = _listing(title="Sold plot", status="sold")

    assert client.put(f"/listings/{lid}", json=update, headers=auth(other)).status_code == 403
    assert client.put(f"/listings/{lid}", json=update, headers=auth(buyer)).status_code == 403
    assert client.delete(f"/listings/{lid}", headers=auth(other)).status_code == 403
    assert client.get(f"/listings/{lid}").json()["title"] == "Plot in Whitefield"

    r = client.put(f"/listings/{lid}", json=update, headers=auth(owner))
    assert r.status_code == 200
    assert r.json()["title"] == "Sold plot" and r.json()["status"] == "sold"
    assert client.get("/listings").json() == []

    assert client.delete(f"/listings/{lid}", headers=auth(owner)).status_code == 204
    assert client.get(f"/listings/{lid}").status_code == 404
    assert client.put(f"/listings/{lid}", json=update, headers=auth(owner)).status_code == 404


def test_me_listings_returns_only_own(client):
    a = _token(client, "a@example.com", "seller")
    b = _token(client, "b@example.com", "seller")
    _create(client, a, title="A1")
    _create(client, b, title="B1")
    assert [x["title"] for x in client.get("/me/listings", headers=auth(a)).json()] == ["A1"]
    assert client.get("/me/listings").status_code == 401


def test_bbox_filter(client):
    seller = _token(client, "seller@example.com", "seller")
    _create(client, seller, title="Bengaluru", lat=12.97, lng=77.59)
    _create(client, seller, title="Mysuru", lat=12.30, lng=76.64)
    _create(client, seller, title="Chennai", lat=13.08, lng=80.27)

    r = client.get("/listings", params={"bbox": "77.3,12.7,77.9,13.3"})
    assert r.status_code == 200
    assert [x["title"] for x in r.json()] == ["Bengaluru"]
    wide = client.get("/listings", params={"bbox": "76.0,12.0,78.0,13.5"}).json()
    assert {x["title"] for x in wide} == {"Bengaluru", "Mysuru"}
    assert client.get("/listings", params={"bbox": "77,12,76"}).status_code == 422
    assert client.get("/listings", params={"bbox": "78,12,77,13"}).status_code == 422


def test_search_filters_and_paging(client):
    seller = _token(client, "seller@example.com", "seller")
    _create(client, seller, title="Farm near Hoskote", price=3000000, land_type="agricultural")
    _create(client, seller, title="Site in Yelahanka", price=8000000)
    _create(client, seller, title="Shop plot", price=20000000, land_type="commercial", address="Hosur Road")

    titles = lambda **p: [x["title"] for x in client.get("/listings", params=p).json()]  # noqa: E731
    assert titles(q="hoskote") == ["Farm near Hoskote"]
    assert titles(q="hosur") == ["Shop plot"]
    assert titles(min_price=5000000, max_price=10000000) == ["Site in Yelahanka"]
    assert titles(land_type="Agricultural") == ["Farm near Hoskote"]
    assert len(titles(limit=2)) == 2 and len(titles(limit=2, offset=2)) == 1
    assert client.get("/listings", params={"limit": 0}).status_code == 422


def test_upload_image_resizes_and_serves(client):
    seller = _token(client, "seller@example.com", "seller")
    lid = _create(client, seller)["id"]
    files = {"file": ("plot.png", _png(), "image/png")}
    r = client.post(f"/listings/{lid}/images", files=files, headers=auth(seller))
    assert r.status_code == 201, r.text
    url = r.json()["images"][0]["url"]
    assert url.startswith("/images/")

    img = client.get(url)
    assert img.status_code == 200 and img.headers["content-type"] == "image/jpeg"
    assert max(Image.open(io.BytesIO(img.content)).size) == 1600

    r = client.post(f"/listings/{lid}/images", files=files, headers=auth(seller))
    assert [i["position"] for i in r.json()["images"]] == [0, 1]

    assert client.delete(f"/listings/{lid}", headers=auth(seller)).status_code == 204
    assert client.get(url).status_code == 404


def test_bad_image_upload_rejected(client):
    seller = _token(client, "seller@example.com", "seller")
    other = _token(client, "other@example.com", "seller")
    lid = _create(client, seller)["id"]
    url = f"/listings/{lid}/images"
    h = auth(seller)

    assert client.post(url, files={"file": ("a.txt", b"hello", "text/plain")}, headers=h).status_code == 415
    assert client.post(url, files={"file": ("a.png", b"not an image", "image/png")}, headers=h).status_code == 400
    gif = io.BytesIO()
    Image.new("RGB", (10, 10)).save(gif, format="GIF")
    assert client.post(url, files={"file": ("a.png", gif.getvalue(), "image/png")}, headers=h).status_code == 415
    big = b"\x89PNG" + b"0" * (5 * 1024 * 1024)
    assert client.post(url, files={"file": ("a.png", big, "image/png")}, headers=h).status_code == 413
    assert client.post(url, files={"file": ("a.png", _png(), "image/png")}, headers=auth(other)).status_code == 403
    assert client.get(f"/listings/{lid}").json()["images"] == []
    assert client.get("/images/9999").status_code == 404
