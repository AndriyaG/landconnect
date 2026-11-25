from app.seed import LISTINGS, seed

LAKH, CRORE = 100_000, 10_000_000


def _titles(client, **params):
    r = client.get("/listings", params=params)
    assert r.status_code == 200, r.text
    return [x["title"] for x in r.json()]


def test_seeded_listings_browse_search_and_filter(client):
    seed()
    seed()
    everything = client.get("/listings").json()
    assert len(everything) == len(LISTINGS)
    assert all(x["images"] and x["owner"].keys() == {"id", "name", "role"} for x in everything)
    assert "@example.com" not in client.get("/listings").text

    assert len(_titles(client, limit=5, offset=0)) == 5
    assert len(_titles(client, limit=5, offset=5)) == 3
    assert set(_titles(client, limit=5, offset=0)).isdisjoint(_titles(client, limit=5, offset=5))

    assert _titles(client, q="hoskote") == ["Mango orchard in Hoskote"]
    assert len(_titles(client, q="  Bengaluru Rural ")) == 3
    assert _titles(client, q="no-such-place") == []

    buckets = {
        "under_50l": ({"max_price": 50 * LAKH - 1}, 2),
        "50l_1cr": ({"min_price": 50 * LAKH, "max_price": CRORE - 1}, 2),
        "1_2cr": ({"min_price": CRORE, "max_price": 2 * CRORE - 1}, 3),
        "over_2cr": ({"min_price": 2 * CRORE}, 1),
    }
    for name, (params, count) in buckets.items():
        assert len(_titles(client, **params)) == count, name
    assert sum(c for _, c in buckets.values()) == len(LISTINGS)

    assert _titles(client, q="bengaluru rural", min_price=CRORE, max_price=2 * CRORE - 1) == [
        "Industrial plot near Nelamangala", "Farm land near Devanahalli airport",
    ]
