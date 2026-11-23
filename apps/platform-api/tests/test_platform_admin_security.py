from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.membership import OrganizationMembership
from app.models.organization import Organization
from app.models.user import User
from app.schemas.auth import UserRole
from app.services.security import create_access_token_for_org, hash_password


def test_tenant_owner_cannot_open_platform_receipt_queue(client: TestClient, db_session: Session):
    org = Organization(
        name='Customer Co',
        slug='customer-co-platform-check',
        subscription_tier='starter',
        subscription_status='active',
        billing_phase='active',
        is_active=True,
    )
    user = User(
        username='customer-owner-platform-check',
        email='owner@customer-platform-check.com',
        password_hash=hash_password('VeryStrongPass9'),
        role=UserRole.ADMIN,
        is_active=True,
        is_platform_admin=False,
    )
    db_session.add_all([org, user])
    db_session.flush()
    db_session.add(
        OrganizationMembership(
            organization_id=org.id,
            user_id=user.id,
            role='owner',
            is_active=True,
        )
    )
    db_session.commit()

    token = create_access_token_for_org(
        subject=str(user.id),
        role=UserRole.ADMIN,
        organization_id=str(org.id),
        token_version=user.token_version,
    )
    response = client.get('/api/v1/receipts/queue', headers={'Authorization': f'Bearer {token}'})
    assert response.status_code == 403
    assert response.json()['detail'] == 'Platform administrator access required'


def test_platform_admin_can_open_cross_tenant_queue_without_workspace_membership(
    client: TestClient,
    db_session: Session,
):
    user = User(
        username='platform-reviewer',
        email='reviewer@platform-check.com',
        password_hash=hash_password('VeryStrongPass9'),
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
    response = client.get('/api/v1/receipts/queue', headers={'Authorization': f'Bearer {token}'})
    assert response.status_code == 200
    assert response.json() == []
