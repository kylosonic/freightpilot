from datetime import datetime
from typing import Annotated, Any
from uuid import UUID

from pydantic import BaseModel, BeforeValidator, model_validator


def _uuid_to_str(v: Any) -> Any:
    if isinstance(v, UUID):
        return str(v)
    return v


UUIDString = Annotated[str, BeforeValidator(_uuid_to_str)]


class ORMBase(BaseModel):
    id: UUIDString
    created_at: datetime

    model_config = {'from_attributes': True}

    @model_validator(mode='before')
    @classmethod
    def _coerce_schema_fields(cls, data):
        if isinstance(data, dict):
            return {k: str(v) if isinstance(v, UUID) else v for k, v in data.items()}
        if data is not None and not isinstance(data, (str, int, float, bool, list)):
            result: dict[str, Any] = {}
            # Read only declared schema fields. Iterating ``dir(data)`` touched
            # every ORM relationship and caused full-table lazy-load queries.
            for attr in cls.model_fields:
                try:
                    val = getattr(data, attr)
                    result[attr] = str(val) if isinstance(val, UUID) else val
                except AttributeError:
                    continue
            return result
        return data
