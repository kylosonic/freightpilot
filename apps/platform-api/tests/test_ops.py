from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.auth import UserRole
from app.services.security import create_access_token_for_org


def test_readiness_endpoint_ok(client: TestClient):
    resp = client.get('/api/v1/ops/ready')
    assert resp.status_code == 200
    assert resp.json()['status'] == 'ok'


def test_metrics_requires_auth(client: TestClient):
    resp = client.get('/api/v1/ops/metrics')
    assert resp.status_code == 401


def test_metrics_forbidden_for_viewer(client: TestClient, viewer_token: str):
    resp = client.get('/api/v1/ops/metrics', headers={'Authorization': f'Bearer {viewer_token}'})
    assert resp.status_code == 403


def test_metrics_forbidden_for_tenant_admin(client: TestClient, admin_token: str):
    resp = client.get('/api/v1/ops/metrics', headers={'Authorization': f'Bearer {admin_token}'})
    assert resp.status_code == 403


def test_metrics_accessible_for_platform_admin(client: TestClient, db_session: Session):
    user = User(
        username='metrics-platform-admin',
        email='metrics-admin@platform.test',
        password_hash='unused',
        role=UserRole.ADMIN,
        is_active=True,
        is_platform_admin=True,
    )
    db_session.add(user)
    db_session.commit()
    token = create_access_token_for_org(
        subject=str(user.id),
        role=UserRole.ADMIN,
        organization_id='00000000-0000-0000-0000-000000000001',
        token_version=user.token_version,
    )
    resp = client.get('/api/v1/ops/metrics', headers={'Authorization': f'Bearer {token}'})
    assert resp.status_code == 200
    payload = resp.json()
    assert 'requests_total' in payload
    assert 'websocket_connections' in payload
