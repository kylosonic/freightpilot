import asyncio

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session
from starlette.websockets import WebSocketDisconnect

from app.api.endpoints.live import _wait_for_next_tick
from app.models.membership import OrganizationMembership


def test_websocket_live_rejects_missing_token(client: TestClient):
    with client.websocket_connect('/api/v1/live/updates') as ws:
        ws.send_json({'type': 'auth'})
        data = ws.receive()
        assert data['type'] == 'websocket.close'


def test_wait_for_next_tick_caps_client_frames():
    class FrameFlood:
        def __init__(self):
            self.count = 0

        async def receive(self):
            self.count += 1
            return {'type': 'websocket.receive', 'text': '{}'}

    websocket = FrameFlood()
    with pytest.raises(WebSocketDisconnect, match='Too many client frames'):
        asyncio.run(_wait_for_next_tick(websocket, seconds=5.0))
    assert websocket.count == 65


def test_websocket_live_accepts_token_and_streams_snapshot(client: TestClient, admin_token: str):
    scoped = client.get(
        '/api/v1/auth/token',
        headers={'Authorization': f'Bearer {admin_token}'},
    )
    assert scoped.status_code == 200, scoped.text
    assert scoped.json()['expires_in_seconds'] == 300
    with client.websocket_connect('/api/v1/live/updates') as ws:
        ws.send_json({'type': 'auth', 'token': scoped.json()['access_token']})
        payload = ws.receive_json()
        assert payload['type'] == 'live_update'
        assert 'inventory_overview' in payload
        assert 'route_summaries' in payload
        assert 'forecast_preview' in payload
        assert 'dispatch_overview' in payload


def test_websocket_live_rejects_unscoped_login_token(client: TestClient, admin_token: str):
    with client.websocket_connect('/api/v1/live/updates') as ws:
        ws.send_json({'type': 'auth', 'token': admin_token})
        data = ws.receive()
        assert data['type'] == 'websocket.close'


def test_websocket_token_cannot_access_regular_api(client: TestClient, admin_token: str):
    scoped = client.get(
        '/api/v1/auth/token',
        headers={'Authorization': f'Bearer {admin_token}'},
    )
    assert scoped.status_code == 200
    response = client.get(
        '/api/v1/auth/me',
        headers={'Authorization': f'Bearer {scoped.json()["access_token"]}'},
    )
    assert response.status_code == 401
    assert response.json()['detail'] == 'Invalid token type'


def test_websocket_closes_after_membership_revocation(
    client: TestClient,
    signup_workspace,
    db_session: Session,
):
    org_id, token = signup_workspace('Live Revocation Workspace')
    scoped = client.get(
        '/api/v1/auth/token',
        headers={
            'Authorization': f'Bearer {token}',
            'X-Organization-Id': org_id,
        },
    )
    assert scoped.status_code == 200, scoped.text
    with client.websocket_connect('/api/v1/live/updates') as ws:
        ws.send_json({'type': 'auth', 'token': scoped.json()['access_token']})
        first = ws.receive_json()
        assert first['type'] == 'live_update'

        membership = db_session.execute(
            select(OrganizationMembership).where(
                OrganizationMembership.organization_id == org_id,
            )
        ).scalar_one()
        membership.is_active = False
        db_session.commit()

        closed = ws.receive()
        assert closed['type'] == 'websocket.close'
