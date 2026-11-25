from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.db import get_db
from app.deps import get_current_user, require_role
from app.models import Listing, ListingImage, ListingStatus, Role, User
from app.schemas.listing import ListingIn, ListingOut, ListingUpdate
from app.services import storage

router = APIRouter(tags=["listings"])
can_list = require_role(Role.seller, Role.broker)


def _query() -> Select[tuple[Listing]]:
    return select(Listing).options(selectinload(Listing.owner), selectinload(Listing.images))


def _parse_bbox(bbox: str) -> tuple[float, float, float, float]:
    try:
        min_lng, min_lat, max_lng, max_lat = (float(v) for v in bbox.split(","))
    except ValueError:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "bbox must be minLng,minLat,maxLng,maxLat")
    if not (-180 <= min_lng <= max_lng <= 180 and -90 <= min_lat <= max_lat <= 90):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "bbox is out of range")
    return min_lng, min_lat, max_lng, max_lat


def _get_listing(db: Session, listing_id: int) -> Listing:
    listing = db.scalar(_query().where(Listing.id == listing_id))
    if listing is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Listing not found")
    return listing


def _owned_listing(db: Session, listing_id: int, user: User) -> Listing:
    listing = _get_listing(db, listing_id)
    if listing.owner_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the owner can change this listing")
    return listing


@router.get("/listings", response_model=list[ListingOut])
def search_listings(
    q: str | None = Query(default=None, max_length=100),
    min_price: int | None = Query(default=None, ge=0),
    max_price: int | None = Query(default=None, ge=0),
    land_type: str | None = Query(default=None, max_length=50),
    bbox: str | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> list[ListingOut]:
    stmt = _query().where(Listing.status == ListingStatus.active)
    if q and q.strip():
        term = q.strip()
        stmt = stmt.where(
            or_(
                Listing.title.icontains(term, autoescape=True),
                Listing.description.icontains(term, autoescape=True),
                Listing.address.icontains(term, autoescape=True),
            )
        )
    if min_price is not None:
        stmt = stmt.where(Listing.price >= min_price)
    if max_price is not None:
        stmt = stmt.where(Listing.price <= max_price)
    if land_type:
        stmt = stmt.where(func.lower(Listing.land_type) == land_type.strip().lower())
    if bbox:
        min_lng, min_lat, max_lng, max_lat = _parse_bbox(bbox)
        stmt = stmt.where(Listing.lng.between(min_lng, max_lng), Listing.lat.between(min_lat, max_lat))
    stmt = stmt.order_by(Listing.created_at.desc(), Listing.id.desc()).limit(limit).offset(offset)
    return [ListingOut.model_validate(item) for item in db.scalars(stmt)]


@router.get("/listings/{listing_id}", response_model=ListingOut)
def get_listing(listing_id: int, db: Session = Depends(get_db)) -> ListingOut:
    return ListingOut.model_validate(_get_listing(db, listing_id))


@router.get("/me/listings", response_model=list[ListingOut])
def my_listings(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[ListingOut]:
    stmt = _query().where(Listing.owner_id == user.id).order_by(Listing.created_at.desc(), Listing.id.desc())
    return [ListingOut.model_validate(item) for item in db.scalars(stmt)]


@router.post("/listings", response_model=ListingOut, status_code=status.HTTP_201_CREATED)
def create_listing(body: ListingIn, user: User = Depends(can_list), db: Session = Depends(get_db)) -> ListingOut:
    listing = Listing(owner_id=user.id, **body.model_dump())
    db.add(listing)
    db.commit()
    return ListingOut.model_validate(_get_listing(db, listing.id))


@router.put("/listings/{listing_id}", response_model=ListingOut)
def update_listing(
    listing_id: int, body: ListingUpdate, user: User = Depends(can_list), db: Session = Depends(get_db)
) -> ListingOut:
    listing = _owned_listing(db, listing_id, user)
    for key, value in body.model_dump().items():
        setattr(listing, key, value)
    db.commit()
    return ListingOut.model_validate(_get_listing(db, listing.id))


@router.delete("/listings/{listing_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_listing(listing_id: int, user: User = Depends(can_list), db: Session = Depends(get_db)) -> None:
    listing = _owned_listing(db, listing_id, user)
    for image in listing.images:
        storage.delete_by_url(db, image.url)
    db.delete(listing)
    db.commit()


@router.post("/listings/{listing_id}/images", response_model=ListingOut, status_code=status.HTTP_201_CREATED)
async def upload_image(
    listing_id: int,
    file: UploadFile = File(...),
    user: User = Depends(can_list),
    db: Session = Depends(get_db),
) -> ListingOut:
    listing = _owned_listing(db, listing_id, user)
    raw = await file.read(storage.MAX_UPLOAD_BYTES + 1)
    try:
        data = storage.process_image(raw, file.content_type)
    except storage.ImageRejected as e:
        raise HTTPException(e.status_code, e.detail)
    position = max((img.position for img in listing.images), default=-1) + 1
    listing.images.append(ListingImage(url=storage.save_image(db, data), position=position))
    db.commit()
    return ListingOut.model_validate(_get_listing(db, listing.id))
