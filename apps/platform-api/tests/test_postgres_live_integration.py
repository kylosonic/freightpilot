from __future__ import annotations

import os

import pytest
from sqlalchemy import create_engine, text


DATABASE_URL = os.environ.get('DATABASE_URL', '')

pytestmark = pytest.mark.skipif(
    not DATABASE_URL.startswith('postgresql'),
    reason='Requires a live PostgreSQL DATABASE_URL',
)


def test_postgres_schema_revision_and_uuid_comparison():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as connection:
        revision = connection.execute(text('select version_num from alembic_version')).scalar_one()
        equal = connection.execute(
            text(
                "select '00000000-0000-0000-0000-000000000001'::uuid "
                "= '00000000-0000-0000-0000-000000000001'::uuid"
            )
        ).scalar_one()

    assert revision == '20261122_0027'
    assert equal is True
