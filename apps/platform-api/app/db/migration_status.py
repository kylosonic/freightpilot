from __future__ import annotations

import re
from collections.abc import Iterable
from pathlib import Path

from sqlalchemy import inspect, text
from sqlalchemy.engine import Connection

_REVISION_RE = re.compile(
    r"^revision(?:\s*:\s*[^=]+)?\s*=\s*['\"]([^'\"]+)['\"]",
    re.MULTILINE,
)
_DOWN_REVISION_RE = re.compile(
    r"^down_revision(?:\s*:\s*[^=]+)?\s*=\s*['\"]([^'\"]+)['\"]",
    re.MULTILINE,
)
_DOWN_REVISION_TUPLE_RE = re.compile(
    r"^down_revision(?:\s*:\s*[^=]+)?\s*=\s*\(([^)]*)\)",
    re.MULTILINE,
)
_QUOTED_VALUE_RE = re.compile(r"['\"]([^'\"]+)['\"]")


def migration_head_from_files(paths: Iterable[Path]) -> str:
    """Resolve the single Alembic head from the migration files in ``paths``."""
    revisions: dict[str, set[str]] = {}
    for path in paths:
        source = path.read_text(encoding='utf-8')
        revision_match = _REVISION_RE.search(source)
        if revision_match is None:
            continue
        down_match = _DOWN_REVISION_RE.search(source)
        tuple_match = _DOWN_REVISION_TUPLE_RE.search(source)
        if down_match:
            parents = {down_match.group(1)}
        elif tuple_match:
            parents = set(_QUOTED_VALUE_RE.findall(tuple_match.group(1)))
        else:
            parents = set()
        revisions[revision_match.group(1)] = parents

    referenced = {parent for parents in revisions.values() for parent in parents}
    heads = sorted(revision for revision in revisions if revision not in referenced)
    if len(heads) != 1:
        raise RuntimeError(f'Expected one repository migration head, found {heads}')
    return heads[0]


def repository_migration_head() -> str:
    """Read the latest revision from the migration files shipped with the API."""
    module_file = Path(__file__).resolve()
    versions_dir = module_file.parents[2] / 'alembic' / 'versions'
    if not versions_dir.is_dir():
        # The source checkout has the migration tree beside platform-api.
        versions_dir = module_file.parents[3] / 'alembic' / 'versions'
    return migration_head_from_files(versions_dir.glob('*.py'))


def database_migration_head(connection: Connection) -> str | None:
    """Return the applied Alembic revision, or None before the first migration."""
    if not inspect(connection).has_table('alembic_version'):
        return None
    revision = connection.execute(text('SELECT version_num FROM alembic_version')).scalar()
    return str(revision) if revision else None


def migration_readiness(connection: Connection) -> dict[str, str | None]:
    """Compare the live revision with the code's expected schema head."""
    expected = repository_migration_head()
    try:
        current = database_migration_head(connection)
    except Exception:
        return {
            'status': 'unavailable',
            'current': None,
            'expected': expected,
        }
    return {
        'status': 'current' if current == expected else 'pending',
        'current': current,
        'expected': expected,
    }
