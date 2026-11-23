from __future__ import annotations

from uuid import UUID

import pandas as pd
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.item import Item
from app.models.membership import OrganizationMembership
from app.models.organization import Organization
from app.models.order import HistoricalOrder
from app.models.provider_key import ProviderApiKey
from app.models.replenishment import ReplenishmentPlan
from app.models.warehouse import Warehouse
from app.schemas.planning import ReplenishmentPlanStatus
from app.services.activation.ingest import upsert_inventory, upsert_orders, upsert_warehouses


def _auth(token: str) -> dict[str, str]:
    return {'Authorization': f'Bearer {token}'}


def test_csv_duplicates_within_one_batch_upsert_instead_of_crashing(db_session: Session):
    organization = db_session.execute(select(Organization)).scalars().first()
    assert organization is not None
    rows = pd.DataFrame(
        [
            {
                'code': 'DUP-WH',
                'name': 'First name',
                'address': '1 Road',
                'city': 'Addis Ababa',
                'state': 'Addis Ababa',
                'country': 'Ethiopia',
                'latitude': 9.0,
                'longitude': 38.7,
                'capacity_units': 100,
            },
            {
                'code': ' DUP-WH ',
                'name': 'Last name wins',
                'address': '2 Road',
                'city': 'Addis Ababa',
                'state': 'Addis Ababa',
                'country': 'Ethiopia',
                'latitude': 9.1,
                'longitude': 38.8,
                'capacity_units': 120,
            },
        ]
    )

    counts = upsert_warehouses(db_session, organization.id, rows)
    db_session.flush()

    stored = db_session.execute(
        select(Warehouse).where(
            Warehouse.organization_id == organization.id,
            Warehouse.code == 'DUP-WH',
        )
    ).scalar_one()
    assert counts == {
        'records_processed': 2,
        'records_created': 1,
        'records_updated': 1,
        'errors': [],
    }
    assert stored.name == 'Last name wins'
    assert stored.capacity_units == 120


def test_csv_integer_fields_reject_fractional_and_negative_values(db_session: Session, signup_workspace):
    org_id, _ = signup_workspace('Fractional CSV Co')
    organization_id = UUID(org_id)
    warehouse = db_session.execute(
        select(Warehouse).where(Warehouse.organization_id == organization_id)
    ).scalars().first()
    item = db_session.execute(
        select(Item).where(Item.organization_id == organization_id)
    ).scalars().first()
    assert warehouse is not None and item is not None

    for invalid in ('10.9', '-0.5'):
        counts = upsert_inventory(
            db_session,
            organization_id,
            pd.DataFrame(
                [
                    {
                        'warehouse_code': warehouse.code,
                        'sku': item.sku,
                        'quantity_on_hand': invalid,
                        'safety_stock': 0,
                    }
                ]
            ),
        )
        assert counts['records_created'] == 0
        assert counts['records_updated'] == 0
        assert counts['errors']


def test_orders_csv_rejects_blank_dates_and_preserves_same_day_rows(
    db_session: Session,
    signup_workspace,
):
    org_id, _ = signup_workspace('Order Events Co')
    organization_id = UUID(org_id)
    warehouse = db_session.execute(
        select(Warehouse).where(Warehouse.organization_id == organization_id)
    ).scalars().first()
    item = db_session.execute(
        select(Item).where(Item.organization_id == organization_id)
    ).scalars().first()
    assert warehouse is not None and item is not None

    blank_date = upsert_orders(
        db_session,
        organization_id,
        pd.DataFrame(
            [
                {
                    'order_date': '',
                    'warehouse_code': warehouse.code,
                    'sku': item.sku,
                    'quantity': 2,
                    'unit_price': 10,
                    'customer_region': 'North',
                }
            ]
        ),
    )
    assert blank_date['records_created'] == 0
    assert blank_date['errors']

    same_day = pd.DataFrame(
        [
            {
                'order_date': '2035-01-02',
                'warehouse_code': warehouse.code,
                'sku': item.sku,
                'quantity': 2,
                'unit_price': 10,
                'customer_region': 'North',
            },
            {
                'order_date': '2035-01-02',
                'warehouse_code': warehouse.code,
                'sku': item.sku,
                'quantity': 3,
                'unit_price': 12,
                'customer_region': 'North',
            },
        ]
    )
    counts = upsert_orders(db_session, organization_id, same_day)
    db_session.commit()

    inserted = db_session.execute(
        select(func.count()).select_from(HistoricalOrder).where(
            HistoricalOrder.organization_id == organization_id,
            HistoricalOrder.order_date == pd.Timestamp('2035-01-02').date(),
        )
    ).scalar_one()
    assert counts['records_created'] == 2
    assert counts['records_updated'] == 0
    assert inserted == 2


def test_provider_names_are_normalized_and_corrupt_keys_fail_soft(
    client: TestClient,
    db_session: Session,
    admin_token: str,
):
    created = client.post(
        '/api/v1/providers/keys',
        headers=_auth(admin_token),
        json={
            'provider_name': '  OpenAI  ',
            'key_name': '  Primary  ',
            'api_key': 'sk-test-1234567890',
        },
    )
    assert created.status_code == 201, created.text
    assert created.json()['provider_name'] == 'openai'
    assert created.json()['key_name'] == 'Primary'

    duplicate = client.post(
        '/api/v1/providers/keys',
        headers=_auth(admin_token),
        json={
            'provider_name': 'openai',
            'key_name': 'Primary',
            'api_key': 'sk-test-other-key',
        },
    )
    assert duplicate.status_code == 409

    key = db_session.get(ProviderApiKey, UUID(created.json()['id']))
    assert key is not None
    key.encrypted_key = 'not-a-valid-fernet-token'
    db_session.commit()

    tested = client.post(
        f"/api/v1/providers/keys/{key.id}/test",
        headers=_auth(admin_token),
    )
    assert tested.status_code == 200
    assert tested.json()['ok'] is False
    assert 'replace or rotate' in tested.json()['message'].lower()


def test_approval_note_is_bounded_before_persisting(
    client: TestClient,
    db_session: Session,
    signup_workspace,
):
    org_id, token = signup_workspace('Planning Note Co')
    org_uuid = UUID(org_id)
    warehouse = db_session.execute(
        select(Warehouse).where(Warehouse.organization_id == org_uuid)
    ).scalars().first()
    item = db_session.execute(
        select(Item).where(Item.organization_id == org_uuid)
    ).scalars().first()
    owner = db_session.execute(
        select(OrganizationMembership).where(
            OrganizationMembership.organization_id == org_uuid,
            OrganizationMembership.role == 'owner',
        )
    ).scalar_one()
    assert warehouse is not None and item is not None

    plan = ReplenishmentPlan(
        organization_id=org_uuid,
        warehouse_id=warehouse.id,
        item_id=item.id,
        horizon_weeks=4,
        avg_weekly_demand=5.0,
        suggested_quantity=10,
        status=ReplenishmentPlanStatus.PENDING_APPROVAL,
        rationale='Projected demand from the latest order history',
        created_by_user_id=owner.user_id,
    )
    db_session.add(plan)
    db_session.commit()

    response = client.post(
        f'/api/v1/planning/replenishment/{plan.id}/approve',
        headers=_auth(token),
        json={'note': 'x' * 255},
    )
    assert response.status_code == 200, response.text
    assert len(response.json()['rationale']) <= 255


def test_register_rejects_an_org_header_without_active_membership(
    client: TestClient,
    db_session: Session,
    admin_token: str,
):
    other_org = Organization(
        name='Unrelated Co',
        slug='unrelated-co',
        primary_email_domain='unrelated.example',
        subscription_tier='free',
        subscription_status='active',
        billing_phase='free',
        is_active=True,
    )
    db_session.add(other_org)
    db_session.commit()

    response = client.post(
        '/api/v1/auth/register',
        headers={
            **_auth(admin_token),
            'X-Organization-Id': str(other_org.id),
        },
        json={
            'username': 'scoped-register-user',
            'email': 'scoped-register@unrelated.example',
            'password': 'VeryStrongPass9',
            'role': 'operator',
        },
    )

    assert response.status_code == 403
    assert 'requested workspace' in response.json()['detail'].lower()
    assert db_session.execute(
        select(func.count()).select_from(OrganizationMembership).where(
            OrganizationMembership.organization_id == other_org.id
        )
    ).scalar_one() == 0
