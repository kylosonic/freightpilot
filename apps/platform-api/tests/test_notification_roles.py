from fastapi.testclient import TestClient


def test_viewer_cannot_dismiss_notification(client: TestClient, viewer_token: str):
    response = client.post(
        '/api/v1/notifications/00000000-0000-0000-0000-000000000001/dismiss',
        headers={'Authorization': f'Bearer {viewer_token}'},
    )
    assert response.status_code == 403
