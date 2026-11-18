from __future__ import annotations

import json
import os
import shutil
import sys
from pathlib import Path

WORKER_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = Path(__file__).resolve().parents[4]
SOURCE_APP = REPO_ROOT / 'apps/platform-api/app'
SOURCE_SAMPLE_DATA = REPO_ROOT / 'apps/platform-api/sample-data'
SOURCE_MIGRATIONS = REPO_ROOT / 'apps/platform-api/alembic/versions'
STAGED_APP = WORKER_ROOT / 'src/app'
STAGED_SAMPLE_DATA = WORKER_ROOT / 'src/sample-data'
STAGED_MIGRATIONS = WORKER_ROOT / 'src/alembic/versions'
OPENAPI_MODULE = WORKER_ROOT / 'src/openapi_schema.py'
SAMPLE_DATA_MODULE = WORKER_ROOT / 'src/sample_data.py'


def _replace_tree(source: Path, destination: Path) -> None:
    resolved_destination = destination.resolve()
    if WORKER_ROOT.resolve() not in resolved_destination.parents:
        raise RuntimeError(f'Refusing to replace path outside Worker project: {resolved_destination}')
    if destination.exists():
        shutil.rmtree(destination)
    shutil.copytree(
        source,
        destination,
        ignore=shutil.ignore_patterns('__pycache__', '*.pyc'),
    )


_replace_tree(SOURCE_APP, STAGED_APP)
_replace_tree(SOURCE_SAMPLE_DATA, STAGED_SAMPLE_DATA)
_replace_tree(SOURCE_MIGRATIONS, STAGED_MIGRATIONS)

os.environ['APP_ENV'] = 'test'
os.environ.pop('DATABASE_URL', None)
sys.path.insert(0, str(SOURCE_APP.parent))
from app.main import app

schema_json = json.dumps(
    app.openapi(),
    separators=(',', ':'),
    sort_keys=True,
)
OPENAPI_MODULE.write_text(
    f'OPENAPI_JSON = {schema_json!r}\n',
    encoding='utf-8',
)

# Cloudflare's Python module loader only attaches modules that are imported
# statically. A Python module can import CSVs as text through importlib, so
# the Worker gets the same sample workspace without relying on filesystem
# paths that do not exist in the runtime.
sample_files = {
    path.name: path.read_text(encoding='utf-8')
    for path in sorted(SOURCE_SAMPLE_DATA.glob('*.csv'))
}
SAMPLE_DATA_MODULE.write_text(
    f'SAMPLE_CSV_FILES = {sample_files!r}\n',
    encoding='utf-8',
)

print(f'Staged FastAPI application in {STAGED_APP}')
print(f'Generated aggregate OpenAPI schema in {OPENAPI_MODULE}')
print(f'Embedded sample CSV data in {SAMPLE_DATA_MODULE}')
