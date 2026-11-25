from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import SessionLocal, init_db
from app.models import AreaUnit, Listing, ListingImage, Role, User
from app.services.auth_service import hash_password

DEMO_PASSWORD = "landconnect123"
DEMO_USERS = [
    ("Demo Buyer", "demo.buyer@example.com", Role.buyer),
    ("Demo Seller", "demo.seller@example.com", Role.seller),
    ("Demo Broker", "demo.broker@example.com", Role.broker),
]

LISTINGS = [
    ("seller", "Corner plot near Whitefield", 12500000, 2400, AreaUnit.sqft, "residential", 12.9698, 77.7500, "Whitefield, Bengaluru"),
    ("seller", "BMRDA approved plot on Sarjapur Road", 7500000, 1500, AreaUnit.sqft, "residential", 12.8600, 77.7860, "Sarjapur Road, Bengaluru"),
    ("seller", "Farm land near Devanahalli airport", 16000000, 2, AreaUnit.acre, "agricultural", 13.2470, 77.7120, "Devanahalli, Bengaluru Rural"),
    ("seller", "Mango orchard in Hoskote", 4000000, 10, AreaUnit.guntha, "agricultural", 13.0700, 77.7980, "Hoskote, Bengaluru Rural"),
    ("seller", "30x40 site in Yelahanka New Town", 8500000, 1200, AreaUnit.sqft, "residential", 13.1007, 77.5963, "Yelahanka, Bengaluru"),
    ("broker", "Commercial land off Hosur Road", 25000000, 4000, AreaUnit.sqft, "commercial", 12.8450, 77.6600, "Electronic City, Bengaluru"),
    ("broker", "Agricultural land in Anekal", 3200000, 40, AreaUnit.cent, "agricultural", 12.7090, 77.6950, "Anekal, Bengaluru Urban"),
    ("broker", "Industrial plot near Nelamangala", 11000000, 1, AreaUnit.acre, "industrial", 13.0970, 77.3940, "Nelamangala, Bengaluru Rural"),
]


def _upsert_user(db: Session, name: str, email: str, role: Role) -> User:
    user = db.scalar(select(User).where(User.email == email))
    if user is None:
        user = User(email=email)
        db.add(user)
    user.name, user.role, user.password_hash = name, role, hash_password(DEMO_PASSWORD)
    return user


def seed() -> None:
    init_db()
    with SessionLocal() as db:
        users = {role.value: _upsert_user(db, name, email, role) for name, email, role in DEMO_USERS}
        db.flush()
        created = 0
        for i, (owner, title, price, area, unit, land_type, lat, lng, address) in enumerate(LISTINGS, start=1):
            owner_id = users[owner].id
            if db.scalar(select(Listing.id).where(Listing.owner_id == owner_id, Listing.title == title)):
                continue
            db.add(Listing(
                owner_id=owner_id, title=title, price=price, area_value=area, area_unit=unit,
                land_type=land_type, lat=lat, lng=lng, address=address,
                description=f"{title}. Clear title, road access, ready for registration.",
                images=[ListingImage(url=f"https://picsum.photos/seed/landconnect-{i}-{p}/800/600", position=p) for p in range(2)],
            ))
            created += 1
        db.commit()
    print(f"Seeded {len(DEMO_USERS)} demo users and {created} new listings (password: {DEMO_PASSWORD})")


if __name__ == "__main__":
    seed()
