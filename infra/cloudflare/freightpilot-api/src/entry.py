from __future__ import annotations

import os
import re
import sys
import time
from json import dumps
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

import asgi
from workers import DurableObject, WorkerEntrypoint

SRC_ROOT = Path(__file__).resolve().parent
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

ENV_NAMES = (
    'ALLOWED_HOSTS',
    'APP_ENV',
    'BLOCKED_PUBLIC_EMAIL_DOMAINS',
    'CBE_ACCOUNT_HOLDER',
    'CBE_ACCOUNT_NUMBER',
    'CONSOLE_URL',
    'CORS_ORIGINS',
    'CSV_MAX_SIZE_BYTES',
    'DASHEN_ACCOUNT_HOLDER',
    'DASHEN_ACCOUNT_NUMBER',
    'JWT_ALGORITHM',
    'JWT_ACCESS_TOKEN_EXPIRE_MINUTES',
    'JWT_SECRET_KEY',
    'LOG_LEVEL',
    'PLATFORM_ADMIN_EMAILS',
    'PLATFORM_ADMIN_BOOTSTRAP_ENABLED',
    'PROVIDER_KEY_ENCRYPTION_SECRET',
    'PROVIDER_KEY_ENCRYPTION_PREVIOUS_SECRET',
    'PROOF_ORG_QUOTA_BYTES',
    'RECEIPT_ORG_QUOTA_BYTES',
    'RECEIPT_MAX_SIZE_BYTES',
    'RECEIPT_PENDING_LIMIT',
    'RECEIPT_EXTRACTION_BASE_URL',
    'RECEIPT_EXTRACTION_MODE',
    'RECEIPT_EXTRACTION_MODEL',
    'REVERSAL_UNDO_WINDOW_HOURS',
    'SMS_BRAND_NAME',
    'SMS_GATEWAY_API_KEY',
    'SMS_GATEWAY_URL',
    'SMS_SENDER_NAME',
    'SMTP_FROM_EMAIL',
    'SMTP_FROM_NAME',
    'SMTP_HOST',
    'SMTP_PASSWORD',
    'SMTP_PORT',
    'SMTP_TIMEOUT_SECONDS',
    'SMTP_USE_SSL',
    'SMTP_USE_TLS',
    'SMTP_USERNAME',
    'WALLET_AUTO_FORWARD_TOLERANCE_ETB',
)

_apps: dict[str, Any] = {}
_REVISION_RE = re.compile(
    r"^revision(?:\s*:\s*[^=]+)?\s*=\s*['\"]([^'\"]+)['\"]", re.MULTILINE
)
_DOWN_REVISION_RE = re.compile(
    r"^down_revision(?:\s*:\s*[^=]+)?\s*=\s*['\"]([^'\"]+)['\"]", re.MULTILINE
)
_DOWN_REVISION_TUPLE_RE = re.compile(
    r"^down_revision(?:\s*:\s*[^=]+)?\s*=\s*\(([^)]*)\)", re.MULTILINE
)
_QUOTED_VALUE_RE = re.compile(r"['\"]([^'\"]+)['\"]")

_SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
}

_RATE_RULES = {
    '/api/v1/auth/login': (20, 60),
    '/api/v1/auth/company-signup': (5, 3600),
    '/api/v1/team/invitations/accept': (10, 60),
}


def _copy_worker_environment(binding: Any) -> None:
    for name in ENV_NAMES:
        value = getattr(binding, name, None)
        if value is not None and str(value) != '':
            os.environ[name] = str(value)

    # Settings performs a production configuration check before request
    # handling. The actual socket comes from the Hyperdrive binding below.
    os.environ.setdefault('DATABASE_URL', 'postgresql+pg8000://hyperdrive')
    os.environ.setdefault('CLOUDFLARE_WORKER', '1')
    os.environ.setdefault('SAMPLE_DATA_DIR', str(SRC_ROOT / 'sample-data'))


class _GroupDurableObject(DurableObject):
    """Run one FastAPI route group in a free-plan SQLite Durable Object.

    Durable Object invocations receive a 30 second CPU budget. That avoids the
    10 ms per-request limit applied to ordinary Workers on the free plan while
    keeping each isolate below the free-plan memory limit.
    """

    group = ''
    _rate_windows: dict[str, tuple[float, int]]

    def __init__(self, state: Any, env: Any):
        super().__init__(state, env)
        self.env = env
        self._rate_windows = {}

    def _rate_limited(self, request: Any) -> Any | None:
        path = _request_path(request.url)
        rule = _RATE_RULES.get(path)
        if rule is None or request.method == 'OPTIONS':
            return None
        limit, period = rule
        headers = getattr(request, 'headers', None)
        client_ip = headers.get('CF-Connecting-IP') if headers is not None else None
        client_key = str(client_ip or 'unknown-client')
        now = time.time()
        bucket = int(now) // period
        expires_at = float((bucket + 1) * period)
        key = f'{path}:{client_key}'
        previous_expiry, count = self._rate_windows.get(key, (expires_at, 0))
        count = 1 if previous_expiry <= now else count + 1
        self._rate_windows[key] = (expires_at, count)
        if len(self._rate_windows) > 2048:
            self._rate_windows = {
                window_key: window
                for window_key, window in self._rate_windows.items()
                if window[0] > now
            }
            if len(self._rate_windows) > 2048:
                newest = sorted(self._rate_windows.items(), key=lambda item: item[1][0])[-2048:]
                self._rate_windows = dict(newest)
        if count <= limit:
            return None

        from workers import Response

        headers_out = {
            **_SECURITY_HEADERS,
            'content-type': 'application/json',
            'cache-control': 'no-store',
            'Retry-After': str(period),
        }
        origin = headers.get('Origin') if headers is not None else None
        configured_origins = str(getattr(self.env, 'CORS_ORIGINS', '') or '').split(',')
        allowed_origins = {item.strip() for item in configured_origins if item.strip()}
        if not allowed_origins:
            from app.core.config import DEFAULT_CORS_ORIGINS

            allowed_origins = set(DEFAULT_CORS_ORIGINS)
        if origin and origin in allowed_origins:
            headers_out['Access-Control-Allow-Origin'] = origin
            headers_out['Access-Control-Allow-Credentials'] = 'true'
            headers_out['Vary'] = 'Origin'

        return Response(
            dumps({'detail': 'Too many requests'}),
            status=429,
            headers=headers_out,
        )

    async def fetch(self, request: Any):
        limited = self._rate_limited(request)
        if limited is not None:
            return limited
        app = _apps.get(self.group)
        if app is None:
            _copy_worker_environment(self.env)
            from worker_app import build_app

            app = build_app(self.group)
            _apps[self.group] = app

        from app.db.session import use_hyperdrive

        with use_hyperdrive(self.env.HYPERDRIVE):
            return await asgi.fetch(app, request.js_object, self.env)


class FreightPilotAPI(_GroupDurableObject):
    group = 'core'


class FreightPilotLogistics(_GroupDurableObject):
    group = 'logistics'


class FreightPilotDispatch(_GroupDurableObject):
    group = 'dispatch'


class FreightPilotRouting(_GroupDurableObject):
    group = 'routing'


class FreightPilotData(_GroupDurableObject):
    group = 'data'


class FreightPilotAccount(_GroupDurableObject):
    group = 'account'


class FreightPilotOperations(_GroupDurableObject):
    group = 'operations'


class FreightPilotFinance(_GroupDurableObject):
    group = 'finance'


class FreightPilotAnalytics(_GroupDurableObject):
    group = 'analytics'


def _binding_value(binding: Any, name: str, default: Any = None) -> Any:
    value = getattr(binding, name, None)
    if value is None:
        try:
            value = binding[name]
        except (TypeError, KeyError, IndexError):
            value = None
    return default if value is None else value


class FreightPilotHealth(DurableObject):
    """Readiness and schema revision check that avoids loading the FastAPI stack."""

    def __init__(self, state: Any, env: Any):
        super().__init__(state, env)
        self.env = env

    async def fetch(self, _request: Any):
        from pg8000.dbapi import connect
        from workers import Response

        expected_revision = _repository_migration_head()
        binding = self.env.HYPERDRIVE
        connection = None
        try:
            connection = connect(
                user=str(_binding_value(binding, 'user', '')),
                password=str(_binding_value(binding, 'password', '')),
                host=str(_binding_value(binding, 'host', '')),
                port=int(_binding_value(binding, 'port', 5432)),
                database=str(_binding_value(binding, 'database', '')),
                ssl_context=False,
            )
            cursor = connection.cursor()
            cursor.execute('SELECT version_num FROM alembic_version')
            row = cursor.fetchone()
            database = 'ok'
            revision = str(row[0]) if row and row[0] else None
            schema = 'current' if revision == expected_revision else 'pending'
        except Exception:  # noqa: BLE001 - readiness must return degraded
            database = 'unavailable'
            revision = None
            schema = 'unavailable'
        finally:
            if connection is not None:
                connection.close()

        status = 'ok' if database == 'ok' and schema == 'current' else 'degraded'
        return Response(
            dumps(
                {
                    'status': status,
                    'db': database,
                    'schema': schema,
                    'revision': revision,
                    'expected_revision': expected_revision,
                }
            ),
            status=200 if status == 'ok' else 503,
            headers={
                **_SECURITY_HEADERS,
                'content-type': 'application/json',
                'cache-control': 'no-store',
            },
        )


def _repository_migration_head() -> str:
    """Read the packaged migration head without importing the FastAPI stack."""
    revisions: dict[str, set[str]] = {}
    for path in (SRC_ROOT / 'alembic' / 'versions').glob('*.py'):
        text = path.read_text(encoding='utf-8')
        revision_match = _REVISION_RE.search(text)
        if revision_match is None:
            continue
        down_match = _DOWN_REVISION_RE.search(text)
        tuple_match = _DOWN_REVISION_TUPLE_RE.search(text)
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


_ROUTE_GROUPS = {
    'auth': ('FREIGHTPILOT_API', 'core'),
    'providers': ('FREIGHTPILOT_API', 'core'),
    'warehouses': ('FREIGHTPILOT_DATA', 'data'),
    'items': ('FREIGHTPILOT_DATA', 'data'),
    'inventory': ('FREIGHTPILOT_DATA', 'data'),
    'orders': ('FREIGHTPILOT_DATA', 'data'),
    'notifications': ('FREIGHTPILOT_DATA', 'data'),
    'feedback': ('FREIGHTPILOT_DATA', 'data'),
    'activation': ('FREIGHTPILOT_ACCOUNT', 'account'),
    'subscriptions': ('FREIGHTPILOT_ACCOUNT', 'account'),
    'team': ('FREIGHTPILOT_ACCOUNT', 'account'),
    'billing': ('FREIGHTPILOT_ACCOUNT', 'account'),
    'shipments': ('FREIGHTPILOT_LOGISTICS', 'logistics'),
    'alerts': ('FREIGHTPILOT_LOGISTICS', 'logistics'),
    'ops': ('FREIGHTPILOT_LOGISTICS', 'logistics'),
    'weather': ('FREIGHTPILOT_LOGISTICS', 'logistics'),
    'drivers': ('FREIGHTPILOT_OPERATIONS', 'operations'),
    'cash-collections': ('FREIGHTPILOT_OPERATIONS', 'operations'),
    'planning': ('FREIGHTPILOT_OPERATIONS', 'operations'),
    'dispatch': ('FREIGHTPILOT_DISPATCH', 'dispatch'),
    'receipts': ('FREIGHTPILOT_FINANCE', 'finance'),
    'invoices': ('FREIGHTPILOT_FINANCE', 'finance'),
    'ingestion': ('FREIGHTPILOT_ROUTING', 'routing'),
    'forecast': ('FREIGHTPILOT_ANALYTICS', 'analytics'),
    'routes': ('FREIGHTPILOT_ROUTING', 'routing'),
    'live': ('FREIGHTPILOT_ANALYTICS', 'analytics'),
}


def _route_group(request_url: Any) -> tuple[str, str]:
    if isinstance(request_url, str):
        path = urlsplit(request_url).path
    else:
        path = request_url.path
    if path == '/health':
        return ('FREIGHTPILOT_HEALTH', 'health')
    parts = [part for part in path.split('/') if part]
    if len(parts) >= 3 and parts[:2] == ['api', 'v1']:
        return _ROUTE_GROUPS.get(parts[2], ('FREIGHTPILOT_API', 'core'))
    return ('FREIGHTPILOT_API', 'core')


def _request_path(request_url: Any) -> str:
    if isinstance(request_url, str):
        return urlsplit(request_url).path
    return request_url.path


class Default(WorkerEntrypoint):
    async def fetch(self, request: Any):
        path = _request_path(request.url)
        if path == '/openapi.json':
            from openapi_schema import OPENAPI_JSON
            from workers import Response

            return Response(
                OPENAPI_JSON,
                headers={
                    **_SECURITY_HEADERS,
                    'content-type': 'application/json',
                    'cache-control': 'public, max-age=300',
                },
            )
        if path == '/docs':
            from workers import Response

            return Response(
                """<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FreightPilot API</title></head>
  <body><h1>FreightPilot API</h1><p><a href="/openapi.json">Open the API schema</a></p></body>
</html>""",
                headers={
                    **_SECURITY_HEADERS,
                    'content-type': 'text/html; charset=utf-8',
                    'cache-control': 'no-store',
                    'Content-Security-Policy': "default-src 'none'; style-src 'none'; base-uri 'none'; frame-ancestors 'none'",
                },
            )
        binding_name, group = _route_group(request.url)
        namespace = getattr(self.env, binding_name)
        object_id = namespace.idFromName(f'freightpilot-{group}')
        return await namespace.get(object_id).fetch(request)
