from uuid import uuid4

import pytest
from sqlalchemy.dialects import postgresql, sqlite

from app.db.custom_types import UUIDType


def test_uuid_type_uses_consistent_sqlite_storage():
    type_ = UUIDType()
    sqlite_type = type_.load_dialect_impl(sqlite.dialect())
    postgres_type = type_.load_dialect_impl(postgresql.dialect())

    assert sqlite_type.length == 36
    assert postgres_type.__class__.__name__ in {'UUID', 'PGUuid'}


def test_uuid_type_round_trips_uuid_and_string_values():
    type_ = UUIDType()
    value = uuid4()

    assert type_.process_bind_param(value, sqlite.dialect()) == str(value)
    assert type_.process_bind_param(str(value), sqlite.dialect()) == str(value)
    assert type_.process_result_value(str(value), sqlite.dialect()) == value
    assert type_.process_result_value(value, sqlite.dialect()) == value
    assert type_.process_bind_param(value, postgresql.dialect()) == value
    assert type_.process_result_value(value, postgresql.dialect()) == value


@pytest.mark.parametrize('dialect', [sqlite.dialect(), postgresql.dialect()])
def test_uuid_type_raises_the_same_error_for_invalid_values(dialect):
    type_ = UUIDType()

    with pytest.raises(ValueError, match='Invalid UUID value'):
        type_.process_bind_param('not-a-uuid', dialect)
    with pytest.raises(ValueError, match='Invalid UUID value'):
        type_.process_result_value(object(), dialect)
