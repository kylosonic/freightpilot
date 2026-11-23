from pydantic import BaseModel, Field

from app.schemas.common import ORMBase


class WarehouseBase(BaseModel):
    code: str = Field(min_length=2, max_length=32)
    name: str = Field(min_length=1, max_length=128)
    address: str = Field(min_length=1, max_length=255)
    city: str = Field(min_length=1, max_length=64)
    state: str = Field(min_length=1, max_length=64)
    country: str = Field(min_length=1, max_length=64)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    capacity_units: int = Field(ge=0, default=0)


class WarehouseCreate(WarehouseBase):
    pass


class WarehouseUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=128)
    address: str | None = Field(default=None, min_length=1, max_length=255)
    city: str | None = Field(default=None, min_length=1, max_length=64)
    state: str | None = Field(default=None, min_length=1, max_length=64)
    country: str | None = Field(default=None, min_length=1, max_length=64)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    capacity_units: int | None = Field(default=None, ge=0)


class WarehouseRead(ORMBase, WarehouseBase):
    pass
