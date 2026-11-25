import io

from PIL import Image, UnidentifiedImageError
from sqlalchemy.orm import Session

from app.models import StoredImage

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}
MAX_UPLOAD_BYTES = 5 * 1024 * 1024
MAX_DIMENSION = 1600
URL_PREFIX = "/images/"


class ImageRejected(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail


def process_image(raw: bytes, content_type: str | None) -> bytes:
    if content_type not in ALLOWED_TYPES:
        raise ImageRejected(415, "Only JPEG, PNG or WebP images are allowed")
    if len(raw) > MAX_UPLOAD_BYTES:
        raise ImageRejected(413, "Image must be 5 MB or smaller")
    try:
        img = Image.open(io.BytesIO(raw))
        if img.format not in ALLOWED_FORMATS:
            raise ImageRejected(415, "Only JPEG, PNG or WebP images are allowed")
        img.thumbnail((MAX_DIMENSION, MAX_DIMENSION))
        img = img.convert("RGB")
    except ImageRejected:
        raise
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        raise ImageRejected(400, "File is not a valid image")
    out = io.BytesIO()
    img.save(out, format="JPEG", quality=85, optimize=True)
    return out.getvalue()


def save_image(db: Session, data: bytes) -> str:
    stored = StoredImage(content_type="image/jpeg", data=data)
    db.add(stored)
    db.flush()
    return f"{URL_PREFIX}{stored.id}"


def get_image(db: Session, image_id: int) -> StoredImage | None:
    return db.get(StoredImage, image_id)


def delete_by_url(db: Session, url: str) -> None:
    if url.startswith(URL_PREFIX) and url[len(URL_PREFIX):].isdigit():
        stored = db.get(StoredImage, int(url[len(URL_PREFIX):]))
        if stored is not None:
            db.delete(stored)
