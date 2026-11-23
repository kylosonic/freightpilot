from __future__ import annotations

from pathlib import Path

import sqlalchemy as sa
from alembic import command
from alembic.config import Config

from app.core.config import settings

_ROOT = Path(__file__).resolve().parent.parent


def test_0027_upgrade_and_downgrade_on_sqlite_with_unnamed_receipt_fk(tmp_path, monkeypatch):
    database = tmp_path / 'migration-0027.sqlite'
    url = f'sqlite+pysqlite:///{database.as_posix()}'
    engine = sa.create_engine(url)
    metadata = sa.MetaData()
    sa.Table(
        'payment_receipts',
        metadata,
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('reversed_by_user_id', sa.String(36), nullable=True),
        sa.Column('decision_made_by_user_id', sa.String(36), nullable=True),
    )
    sa.Table(
        'wallet_credits',
        metadata,
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('receipt_id', sa.String(36), sa.ForeignKey('payment_receipts.id'), nullable=False),
        sa.Column('applied_to_invoice_id', sa.String(36), nullable=True),
    )
    sa.Table(
        'threshold_crossings',
        metadata,
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('threshold_level', sa.String(24), nullable=False),
    )
    sa.Table('users', metadata, sa.Column('id', sa.String(36), primary_key=True))
    metadata.create_all(engine)

    monkeypatch.setattr(settings, 'database_url', url)
    config = Config(str(_ROOT / 'alembic.ini'))
    command.stamp(config, '20261107_0026')
    command.upgrade(config, 'head')

    inspector = sa.inspect(engine)
    assert 'is_platform_admin' in {
        column['name'] for column in inspector.get_columns('users')
    }
    assert 'ck_threshold_crossing_level' in {
        constraint['name'] for constraint in inspector.get_check_constraints('threshold_crossings')
    }
    assert 'ix_wallet_credits_receipt_id' in {
        index['name'] for index in inspector.get_indexes('wallet_credits')
    }

    command.downgrade(config, '20261107_0026')
    inspector = sa.inspect(engine)
    assert 'is_platform_admin' not in {
        column['name'] for column in inspector.get_columns('users')
    }
    assert 'ck_threshold_crossing_level' not in {
        constraint['name'] for constraint in inspector.get_check_constraints('threshold_crossings')
    }
