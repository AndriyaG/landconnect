from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.services import storage

router = APIRouter(tags=["images"])


@router.get("/images/{image_id}")
def get_image(image_id: int, db: Session = Depends(get_db)) -> Response:
    image = storage.get_image(db, image_id)
    if image is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Image not found")
    return Response(
        content=image.data,
        media_type=image.content_type,
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )
