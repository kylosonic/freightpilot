from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import pytest
from sqlalchemy import create_engine, text

from app.db.migration_status import (
    database_migration_head,
    migration_head_from_files,
    repository_migration_head,
)


def test_repository_head_is_the_pinned_migration():
    assert repository_migration_head() == '20261107_0026'


def test_unmigrated_database_has_no_revision():
    engine = create_engine('sqlite+pysqlite:///:memory:')
    with engine.connect() as connection:
        assert database_migration_head(connection) is None


def test_applied_revision_is_read_from_the_database():
    engine = create_engine('sqlite+pysqlite:///:memory:')
    with engine.begin() as connection:
        connection.execute(text('CREATE TABLE alembic_version (version_num VARCHAR(32))'))
        connection.execute(text("INSERT INTO alembic_version VALUES ('20261107_0026')"))
    with engine.connect() as connection:
        assert database_migration_head(connection) == '20261107_0026'


def test_migration_head_supports_merge_migrations(tmp_path):
    (tmp_path / 'base.py').write_text("revision = 'base'\n", encoding='utf-8')
    (tmp_path / 'left.py').write_text(
        "revision = 'left'\ndown_revision = 'base'\n",
        encoding='utf-8',
    )
    (tmp_path / 'right.py').write_text(
        "revision = 'right'\ndown_revision = 'base'\n",
        encoding='utf-8',
    )
    (tmp_path / 'merge.py').write_text(
        "revision = 'merge'\ndown_revision = ('left', 'right')\n",
        encoding='utf-8',
    )
    assert migration_head_from_files(tmp_path.glob('*.py')) == 'merge'


def test_migration_head_rejects_divergent_branches(tmp_path):
    (tmp_path / 'base.py').write_text("revision = 'base'\n", encoding='utf-8')
    (tmp_path / 'left.py').write_text(
        "revision = 'left'\ndown_revision = 'base'\n",
        encoding='utf-8',
    )
    (tmp_path / 'right.py').write_text(
        "revision = 'right'\ndown_revision = 'base'\n",
        encoding='utf-8',
    )
    with pytest.raises(RuntimeError, match=r"found \['left', 'right'\]"):
        migration_head_from_files(tmp_path.glob('*.py'))


def test_worker_finds_migration_head_in_its_packaged_tree(tmp_path):
    worker_root = tmp_path / 'worker'
    app_dir = worker_root / 'app'
    versions_dir = worker_root / 'alembic' / 'versions'
    app_dir.mkdir(parents=True)
    versions_dir.mkdir(parents=True)
    (versions_dir / 'head.py').write_text("revision = 'packaged'\n", encoding='utf-8')
    module_path = app_dir / 'db' / 'migration_status.py'
    module_path.parent.mkdir()
    module_path.write_bytes(
        Path(__file__).resolve().parents[1].joinpath('app/db/migration_status.py').read_bytes()
    )
    spec = importlib.util.spec_from_file_location('packaged_migration_status', module_path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    try:
        spec.loader.exec_module(module)
        assert module.repository_migration_head() == 'packaged'
    finally:
        sys.modules.pop(spec.name, None)


def test_schema_endpoint_reports_pending_without_exposing_connection_details(client):
    response = client.get('/api/v1/health/schema')
    assert response.status_code == 200
    assert response.json() == {
        'status': 'pending',
        'current': None,
        'expected': '20261107_0026',
    }
    assert 'sqlite' not in response.text.lower()


def test_worker_packages_migration_files():
    worker_root = Path(__file__).resolve().parents[3] / 'infra' / 'cloudflare' / 'freightpilot-api'
    script = worker_root / 'scripts' / 'prepare_app.py'
    assert 'SOURCE_MIGRATIONS' in script.read_text(encoding='utf-8')
    assert '_replace_tree(SOURCE_MIGRATIONS, STAGED_MIGRATIONS)' in script.read_text(
        encoding='utf-8'
    )
    assert 'SAMPLE_DATA_MODULE' in script.read_text(encoding='utf-8')
    assert "('health', '/health')" in (worker_root / 'src' / 'worker_app.py').read_text(
        encoding='utf-8'
    )
    assert '_DOWN_REVISION_TUPLE_RE' in (worker_root / 'src' / 'entry.py').read_text(
        encoding='utf-8'
    )


def test_production_smoke_requires_the_live_schema_revision():
    workflow = (
        Path(__file__).resolve().parents[3]
        / '.github'
        / 'workflows'
        / 'production-smoke.yml'
    ).read_text(encoding='utf-8')
    assert "health['schema'] == 'current'" in workflow
    assert "health['revision'] == health['expected_revision']" in workflow
    assert "health['revision'] == '20261107_0026'" in workflow
    assert '/api/v1/health/schema' in workflow
