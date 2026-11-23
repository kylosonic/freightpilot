from __future__ import annotations

import importlib.util
import sys
import types
from pathlib import Path


class _FakeDurableObject:
    def __init__(self, *_args, **_kwargs):
        pass


class _FakeResponse:
    def __init__(self, body, status, headers):
        self.body = body
        self.status = status
        self.headers = headers


class _FakeHeaders(dict):
    pass


class _FakeRequest:
    def __init__(self, url: str, method: str, headers: dict[str, str]):
        self.url = url
        self.method = method
        self.headers = _FakeHeaders(headers)


def _load_entry(monkeypatch):
    workers = types.ModuleType('workers')
    workers.DurableObject = _FakeDurableObject
    workers.WorkerEntrypoint = object
    workers.Response = _FakeResponse
    monkeypatch.setitem(sys.modules, 'workers', workers)
    monkeypatch.setitem(sys.modules, 'asgi', types.ModuleType('asgi'))

    path = (
        Path(__file__).resolve().parents[3]
        / 'infra'
        / 'cloudflare'
        / 'freightpilot-api'
        / 'src'
        / 'entry.py'
    )
    spec = importlib.util.spec_from_file_location('freightpilot_worker_entry_test', path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_rate_windows_evict_expired_period_windows(monkeypatch):
    entry = _load_entry(monkeypatch)
    monkeypatch.setattr(entry.time, 'time', lambda: 10_000.0)
    instance = entry._GroupDurableObject(None, types.SimpleNamespace(CORS_ORIGINS=''))
    instance._rate_windows = {
        f'old:{index}': (9_999.0, 1)
        for index in range(2_048)
    }
    request = _FakeRequest(
        'https://freightpilot-api.example/api/v1/auth/login',
        'POST',
        {'CF-Connecting-IP': '203.0.113.9'},
    )

    assert instance._rate_limited(request) is None
    assert len(instance._rate_windows) == 1
    assert instance._rate_windows['/api/v1/auth/login:203.0.113.9'][0] == 10_020.0


def test_rate_limit_429_includes_default_cors_headers(monkeypatch):
    entry = _load_entry(monkeypatch)
    monkeypatch.setattr(entry.time, 'time', lambda: 10_000.0)
    instance = entry._GroupDurableObject(None, types.SimpleNamespace(CORS_ORIGINS=''))
    request = _FakeRequest(
        'https://freightpilot-api.example/api/v1/auth/login',
        'POST',
        {
            'CF-Connecting-IP': '203.0.113.10',
            'Origin': 'https://freightpilot.pages.dev',
        },
    )

    response = None
    for _ in range(21):
        response = instance._rate_limited(request)

    assert isinstance(response, _FakeResponse)
    assert response.status == 429
    assert response.headers['Access-Control-Allow-Origin'] == 'https://freightpilot.pages.dev'
    assert response.headers['Access-Control-Allow-Credentials'] == 'true'
