from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import jwt
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.endpoints.dispatch.common import (
    _CUSTOMER_TRACKING_HOURS,
    _customer_in_org,
    _customer_read,
    _order_in_org,
    _order_read,
    _org,
)
from app.api.security import (
    get_current_membership,
    organization_scoped_get,
    require_roles,
    require_writable_workspace,
    scoped_to_organization,
    validate_uuid,
)
from app.core.config import settings
from app.db.session import get_db
from app.models.dispatch import Customer, DeliveryOrder, DeliveryProof, DispatchRun
from app.models.driver import Driver
from app.models.item import Item
from app.models.membership import OrganizationMembership
from app.models.organization import Organization
from app.models.user import User
from app.schemas.auth import UserRole
from app.schemas.dispatch import (
    CustomerCreate,
    CustomerRead,
    CustomerTrackingLinkResponse,
    CustomerTrackingRead,
    DeliveryOrderCreate,
    DeliveryOrderRead,
)
from app.services.security import decode_access_token

router = APIRouter()


@router.get('/customers', response_model=list[CustomerRead])
def list_customers(
    db: Session = Depends(get_db),
    membership: OrganizationMembership = Depends(get_current_membership),
    _: User = Depends(require_roles(UserRole.VIEWER, UserRole.OPERATOR, UserRole.ADMIN)),
):
    return (
        db.execute(
            scoped_to_organization(select(Customer), Customer, membership.organization_id).order_by(
                Customer.name
            )
        )
        .scalars()
        .all()
    )


@router.post('/customers', response_model=CustomerRead, status_code=201)
def create_customer(
    payload: CustomerCreate,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(UserRole.OPERATOR, UserRole.ADMIN)),
    writable: OrganizationMembership = Depends(require_writable_workspace),
):
    organization_id = _org(actor, writable)
    duplicate = db.execute(
        select(Customer.id).where(
            Customer.organization_id == organization_id,
            Customer.code == payload.code.strip().upper(),
        )
    ).first()
    if duplicate:
        raise HTTPException(status_code=409, detail='Customer code already exists')
    customer = Customer(
        organization_id=organization_id,
        code=payload.code.strip().upper(),
        name=payload.name.strip(),
        phone=payload.phone,
        address=payload.address.strip(),
        latitude=payload.latitude,
        longitude=payload.longitude,
        notes=payload.notes,
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return _customer_read(customer)


@router.get('/orders', response_model=list[DeliveryOrderRead])
def list_delivery_orders(
    run_id: str | None = None,
    status_filter: str | None = None,
    db: Session = Depends(get_db),
    membership: OrganizationMembership = Depends(get_current_membership),
    _: User = Depends(require_roles(UserRole.VIEWER, UserRole.OPERATOR, UserRole.ADMIN)),
):
    stmt = select(DeliveryOrder).where(DeliveryOrder.organization_id == membership.organization_id)
    if run_id:
        stmt = stmt.where(
            DeliveryOrder.dispatch_run_id
            == validate_uuid(run_id, detail='Invalid dispatch run identifier')
        )
    if status_filter:
        stmt = stmt.where(DeliveryOrder.status == status_filter)
    orders = db.execute(stmt.order_by(DeliveryOrder.created_at.desc())).scalars().all()
    customer_ids = {order.customer_id for order in orders}
    customers = (
        db.execute(select(Customer).where(Customer.id.in_(customer_ids))).scalars().all()
        if customer_ids
        else []
    )
    customer_by_id = {customer.id: customer for customer in customers}
    return [_order_read(order, customer_by_id.get(order.customer_id)) for order in orders]


@router.post('/orders', response_model=DeliveryOrderRead, status_code=201)
def create_delivery_order(
    payload: DeliveryOrderCreate,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(UserRole.OPERATOR, UserRole.ADMIN)),
    writable: OrganizationMembership = Depends(require_writable_workspace),
):
    organization_id = _org(actor, writable)
    customer = _customer_in_org(db, organization_id, payload.customer_id)
    if payload.item_id:
        organization_scoped_get(
            db,
            Item,
            payload.item_id,
            organization_id,
            not_found_detail='Item not found',
            include_legacy_null=False,
        )
    if (
        payload.window_start is not None
        and payload.window_end is not None
        and payload.window_start > payload.window_end
    ):
        raise HTTPException(status_code=422, detail='window_start must be before window_end')
    duplicate = db.execute(
        select(DeliveryOrder.id).where(
            DeliveryOrder.organization_id == organization_id,
            DeliveryOrder.order_no == payload.order_no.strip(),
        )
    ).first()
    if duplicate:
        raise HTTPException(status_code=409, detail='Delivery order number already exists')
    order = DeliveryOrder(
        organization_id=organization_id,
        customer_id=customer.id,
        item_id=payload.item_id,
        order_no=payload.order_no.strip(),
        quantity_units=payload.quantity_units,
        cod_amount_etb=payload.cod_amount_etb,
        window_start=payload.window_start,
        window_end=payload.window_end,
        service_minutes=payload.service_minutes,
        priority=payload.priority,
        notes=payload.notes,
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return _order_read(order, customer)


@router.get('/orders/{order_id}', response_model=DeliveryOrderRead)
def get_delivery_order(
    order_id: str,
    db: Session = Depends(get_db),
    membership: OrganizationMembership = Depends(get_current_membership),
    _: User = Depends(require_roles(UserRole.VIEWER, UserRole.OPERATOR, UserRole.ADMIN)),
):
    order = _order_in_org(db, membership.organization_id, order_id)
    customer = _customer_in_org(db, membership.organization_id, str(order.customer_id))
    return _order_read(order, customer)


@router.post(
    '/orders/{order_id}/tracking-link',
    response_model=CustomerTrackingLinkResponse,
)
def create_customer_tracking_link(
    order_id: str,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(UserRole.OPERATOR, UserRole.ADMIN)),
    writable: OrganizationMembership = Depends(require_writable_workspace),
):
    organization_id = _org(actor, writable)
    order = _order_in_org(db, organization_id, order_id)
    expires_at = datetime.now(UTC) + timedelta(hours=_CUSTOMER_TRACKING_HOURS)
    token = jwt.encode(
        {
            'sub': str(order.id),
            'org_id': str(organization_id),
            'scope': 'customer_tracking',
            'iat': int(datetime.now(UTC).timestamp()),
            'exp': int(expires_at.timestamp()),
            'jti': uuid4().hex,
        },
        settings.effective_jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )
    return CustomerTrackingLinkResponse(
        token=token,
        tracking_url=f'{settings.console_url.rstrip("/")}/track#token={token}',
        expires_at=expires_at,
    )


@router.get('/tracking', response_model=CustomerTrackingRead)
def get_customer_tracking(
    x_tracking_token: str = Header(default='', alias='X-Tracking-Token'),
    db: Session = Depends(get_db),
):
    if not x_tracking_token:
        raise HTTPException(status_code=401, detail='Tracking token required')
    try:
        token_payload = decode_access_token(x_tracking_token)
        if token_payload.get('scope') != 'customer_tracking':
            raise ValueError('wrong scope')
        organization_id = UUID(str(token_payload['org_id']))
        order_id = UUID(str(token_payload['sub']))
    except (KeyError, TypeError, ValueError):
        raise HTTPException(status_code=401, detail='Invalid or expired tracking token') from None

    organization = db.get(Organization, organization_id)
    order = db.get(DeliveryOrder, order_id)
    if (
        organization is None
        or not organization.is_active
        or order is None
        or order.organization_id != organization_id
    ):
        raise HTTPException(status_code=404, detail='Tracking link not found')
    customer = db.get(Customer, order.customer_id)
    if customer is None or customer.organization_id != organization_id:
        raise HTTPException(status_code=404, detail='Tracking link not found')

    run = db.get(DispatchRun, order.dispatch_run_id) if order.dispatch_run_id else None
    driver = db.get(Driver, run.driver_id) if run and run.driver_id else None
    planned_arrival = None
    if run is not None:
        for stop in run.stops_json or []:
            if str(stop.get('order_id')) == str(order.id):
                raw_arrival = stop.get('planned_arrival')
                if raw_arrival:
                    planned_arrival = datetime.fromisoformat(str(raw_arrival))
                break
    proof_count = db.execute(
        select(func.count(DeliveryProof.id)).where(
            DeliveryProof.organization_id == organization_id,
            DeliveryProof.delivery_order_id == order.id,
        )
    ).scalar_one()
    return CustomerTrackingRead(
        order_no=order.order_no,
        customer_name=customer.name,
        status=order.status,
        route_name=run.route_name if run else None,
        driver_name=driver.full_name if driver else None,
        planned_arrival=planned_arrival,
        window_start=order.window_start,
        window_end=order.window_end,
        proof_available=proof_count > 0,
        updated_at=order.updated_at,
    )
