from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

PLATFORM_API = Path(__file__).resolve().parents[1]
WORKER_SRC = PLATFORM_API.parents[1] / 'infra' / 'cloudflare' / 'freightpilot-api' / 'src'


def _run_with_blocked_module(module_prefix: str, code: str, *, worker: bool) -> None:
    blocker = f'''\
import importlib.abc
import sys

class Blocker(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path=None, target=None):
        if fullname == {module_prefix!r} or fullname.startswith({module_prefix!r} + '.'):
            raise ModuleNotFoundError(f"No module named {{fullname!r}}")
        return None

sys.meta_path.insert(0, Blocker())
'''
    env = os.environ.copy()
    python_path = [str(PLATFORM_API)]
    if worker:
        python_path.insert(0, str(WORKER_SRC))
        env['CLOUDFLARE_WORKER'] = '1'
        env.setdefault('DATABASE_URL', 'postgresql+pg8000://hyperdrive')
        env.setdefault('JWT_SECRET_KEY', 'ci-runtime-boot-jwt-secret-at-least-32-characters')
        env.setdefault('PROVIDER_KEY_ENCRYPTION_SECRET', 'ci-runtime-boot-provider-secret-32-chars')
    env['PYTHONPATH'] = os.pathsep.join(python_path)

    completed = subprocess.run(
        [sys.executable, '-c', blocker + code],
        cwd=PLATFORM_API,
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )
    assert completed.returncode == 0, completed.stderr


def test_worker_core_and_finance_groups_import_without_cryptography():
    _run_with_blocked_module(
        'cryptography',
        "import worker_app\nworker_app.build_app('core')\nworker_app.build_app('finance')\n",
        worker=True,
    )


def test_docker_entrypoint_imports_without_pycryptodome():
    _run_with_blocked_module('Crypto', 'import app.main\n', worker=False)
