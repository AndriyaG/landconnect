from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models import AreaUnit, ListingStatus
from app.schemas.user import PublicUser


class ListingIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=5000)
    price: int = Field(ge=0)
    area_value: float = Field(gt=0)
    area_unit: AreaUnit
    land_type: str = Field(min_length=1, max_length=50)
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    address: str = Field(default="", max_length=300)


class ListingUpdate(ListingIn):
    status: ListingStatus = ListingStatus.active


class ListingImageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    url: str
    position: int


class ListingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner: PublicUser
    title: str
    description: str
    price: int
    area_value: float
    area_unit: AreaUnit
    land_type: str
    status: ListingStatus
    lat: float
    lng: float
    address: str
    created_at: datetime
    images: list[ListingImageOut]
