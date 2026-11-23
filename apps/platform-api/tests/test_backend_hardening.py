from __future__ import annotations

from datetime import UTC, datetime, timedelta

import jwt
from fastapi.testclient import TestClient
from sqlalchemy import create_engine

import app.main as main_module
from app.core.config import settings
from app.db.base import Base
from app.models import load_all_models

load_all_models()
def _token(**claims) -> str:
    now = datetime.now(UTC)
    payload = {
        'iat': int(now.timestamp()),
        'exp': int((now + timedelta(hours=1)).timestamp()),
        **claims,
    }
    return jwt.encode(payload, settings.effective_jwt_secret_key, algorithm=settings.jwt_algorithm)


def test_tracking_and_driver_tokens_cannot_authenticate_session_endpoints(client: TestClient):
    for token in (
        _token(sub='00000000-0000-0000-0000-000000000001', org_id='00000000-0000-0000-0000-000000000002', scope='customer_tracking'),
        _token(sub='00000000-0000-0000-0000-000000000001', org_id='00000000-0000-0000-0000-000000000002', run_id='00000000-0000-0000-0000-000000000003', scope='driver_run'),
    ):
        response = client.get('/api/v1/auth/me', headers={'Authorization': f'Bearer {token}'})
        assert response.status_code == 401
        assert response.json()['detail'] == 'Invalid token type'


def test_malformed_scoped_identifier_is_a_client_error(client: TestClient, admin_token: str):
    response = client.get(
        '/api/v1/dispatch/runs/not-a-uuid',
        headers={'Authorization': f'Bearer {admin_token}'},
    )
    assert response.status_code == 422


def test_malformed_org_header_is_a_client_error(client: TestClient, admin_token: str):
    response = client.get(
        '/api/v1/warehouses',
        headers={
            'Authorization': f'Bearer {admin_token}',
            'X-Organization-Id': 'not-a-uuid',
        },
    )
    assert response.status_code == 422
    assert response.json()['detail'] == 'Invalid organization identifier'


def test_malformed_dispatch_identifiers_are_client_errors(client: TestClient, admin_token: str):
    filtered = client.get(
        '/api/v1/dispatch/orders?run_id=not-a-uuid',
        headers={'Authorization': f'Bearer {admin_token}'},
    )
    assert filtered.status_code == 422

    planned = client.post(
        '/api/v1/dispatch/runs',
        headers={'Authorization': f'Bearer {admin_token}'},
        json={
            'route_name': 'Malformed order check',
            'plan_date': '2026-11-24',
            'start_label': 'Test depot',
            'start_latitude': 9.0,
            'start_longitude': 38.7,
            'order_ids': ['not-a-uuid'],
            'vehicle_capacity_units': 100,
        },
    )
    assert planned.status_code == 422


def test_health_is_degraded_when_schema_is_pending(client: TestClient, monkeypatch):
    engine = create_engine('sqlite+pysqlite:///:memory:')
    monkeypatch.setattr(main_module, 'get_engine', lambda: engine)
    monkeypatch.setattr(
        main_module,
        'migration_readiness',
        lambda _connection: {
            'status': 'pending',
            'current': '20261107_0026',
            'expected': '20261122_0027',
        },
    )

    response = client.get('/health')

    assert response.status_code == 503
    assert response.json() == {
        'status': 'degraded',
        'db': 'ok',
        'schema': 'pending',
        'revision': '20261107_0026',
        'expected_revision': '20261122_0027',
    }


def test_every_foreign_key_column_has_a_leading_index():
    missing: list[str] = []
    for table in Base.metadata.sorted_tables:
        indexed_columns = {
            columns[0]
            for index in table.indexes
            if (columns := [column.name for column in index.columns])
        }
        for foreign_key in table.foreign_keys:
            if foreign_key.parent.name not in indexed_columns:
                missing.append(f'{table.name}.{foreign_key.parent.name}')
    assert missing == []
