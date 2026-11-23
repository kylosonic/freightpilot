from __future__ import annotations

from uuid import UUID

from sqlalchemy import CHAR, TypeDecorator
from sqlalchemy.dialects.postgresql import UUID as PG_UUID


class UUIDType(TypeDecorator):
    impl = CHAR(36)
    cache_ok = True

    @staticmethod
    def _coerce(value: object) -> UUID:
        if isinstance(value, UUID):
            return value
        try:
            return UUID(str(value))
        except (TypeError, ValueError, AttributeError):
            raise ValueError('Invalid UUID value') from None

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(PG_UUID())
        return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        parsed = self._coerce(value)
        if dialect.name == 'postgresql':
            return parsed
        return str(parsed)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        if dialect.name == 'postgresql':
            return self._coerce(value)
        return self._coerce(value)
