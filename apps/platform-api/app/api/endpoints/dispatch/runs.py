from __future__ import annotations

from datetime import UTC, datetime, time, timedelta
from decimal import Decimal
from uuid import UUID, uuid4

import jwt
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.endpoints.dispatch.common import (
    _TERMINAL_ORDER_STATUSES,
    _fleet_route_name,
    _org,
    _run_detail,
)
from app.api.security import (
    get_current_membership,
    organization_scoped_get,
    require_roles,
    require_writable_workspace,
    validate_uuid,
)
from app.core.config import settings
from app.db.session import get_db
from app.models.dispatch import Customer, DeliveryOrder, DispatchRun
from app.models.driver import Driver
from app.models.membership import OrganizationMembership
from app.models.user import User
from app.schemas.auth import UserRole
from app.schemas.dispatch import (
    CashCloseRequest,
    CashCloseSummary,
    DispatchPlanRequest,
    DispatchRunDetail,
    DispatchRunRead,
    DriverLinkResponse,
    FleetDispatchPlanRequest,
    FleetDispatchPlanResponse,
)
from app.services.audit import record_audit_event
from app.services.dispatch import plan_fleet_time_window_routes, plan_time_window_route

router = APIRouter()


@router.post('/runs', response_model=DispatchRunDetail, status_code=201)
def plan_dispatch_run(
    payload: DispatchPlanRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(UserRole.OPERATOR, UserRole.ADMIN)),
    writable: OrganizationMembership = Depends(require_writable_workspace),
):
    organization_id = _org(actor, writable)
    order_ids = list(dict.fromkeys(payload.order_ids))
    orders = (
        db.execute(
            select(DeliveryOrder).where(
                DeliveryOrder.organization_id == organization_id,
                DeliveryOrder.id.in_(
                    [validate_uuid(order_id, detail='Invalid order identifier') for order_id in order_ids]
                ),
                DeliveryOrder.status == 'planned',
            )
            .with_for_update()
        )
        .scalars()
        .all()
    )
    by_id = {str(order.id): order for order in orders}
    if len(by_id) != len(order_ids):
        raise HTTPException(status_code=422, detail='One or more orders are not plannable')

    customer_ids = {order.customer_id for order in orders}
    customers = (
        db.execute(
            select(Customer).where(
                Customer.organization_id == organization_id,
                Customer.id.in_(customer_ids),
            )
        )
        .scalars()
        .all()
    )
    customer_by_id = {customer.id: customer for customer in customers}
    if any(order.customer_id not in customer_by_id for order in orders):
        raise HTTPException(status_code=422, detail='A delivery order has no customer')

    driver = None
    if payload.driver_id:
        driver = organization_scoped_get(
            db,
            Driver,
            payload.driver_id,
            organization_id,
            not_found_detail='Driver not found',
            include_legacy_null=False,
        )
        if driver.status != 'active':
            raise HTTPException(status_code=422, detail='Driver is not active')

    start_time = payload.start_time or datetime.combine(payload.plan_date, time(8, 0), tzinfo=UTC)
    planned = plan_time_window_route(
        start_label=payload.start_label,
        start_latitude=payload.start_latitude,
        start_longitude=payload.start_longitude,
        start_time=start_time,
        orders=[
            {
                'id': order.id,
                'order_no': order.order_no,
                'quantity_units': order.quantity_units,
                'priority': order.priority,
                'service_minutes': order.service_minutes,
                'window_start': order.window_start,
                'window_end': order.window_end,
                'latitude': customer_by_id[order.customer_id].latitude,
                'longitude': customer_by_id[order.customer_id].longitude,
            }
            for order in orders
        ],
        vehicle_capacity_units=payload.vehicle_capacity_units,
        max_stops=payload.max_stops,
        average_speed_kmh=payload.average_speed_kmh,
    )
    if not planned['stops']:
        raise HTTPException(status_code=422, detail='No delivery orders fit this vehicle')

    run = DispatchRun(
        organization_id=organization_id,
        route_name=payload.route_name.strip(),
        plan_date=payload.plan_date,
        start_label=payload.start_label,
        start_latitude=payload.start_latitude,
        start_longitude=payload.start_longitude,
        vehicle_capacity_units=payload.vehicle_capacity_units,
        max_stops=payload.max_stops,
        total_distance_km=planned['total_distance_km'],
        estimated_duration_min=planned['estimated_duration_min'],
        expected_cash_etb=sum(
            (
                by_id[stop['order_id']].cod_amount_etb
                for stop in planned['stops']
            ),
            Decimal('0.00'),
        ),
        status='planned',
        driver_id=driver.id if driver else None,
        created_by_user_id=actor.id,
        stops_json=planned['stops'],
        unassigned_json=planned['unassigned'],
    )
    db.add(run)
    db.flush()
    for stop in planned['stops']:
        order = by_id[stop['order_id']]
        order.dispatch_run_id = run.id
        order.driver_id = driver.id if driver else None
        order.stop_sequence = stop['sequence']
        order.status = 'assigned'
    record_audit_event(
        db,
        event_type='dispatch.run_planned',
        entity_type='dispatch_run',
        entity_id=str(run.id),
        actor=actor,
        organization_id=str(organization_id),
        description=f'Planned {len(planned["stops"])} customer stops',
        payload={'order_count': len(planned['stops']), 'driver_id': driver.id if driver else None},
    )
    db.commit()
    db.refresh(run)
    return _run_detail(db, run)


@router.post('/plan-fleet', response_model=FleetDispatchPlanResponse, status_code=201)
def plan_fleet_dispatch(
    payload: FleetDispatchPlanRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(UserRole.OPERATOR, UserRole.ADMIN)),
    writable: OrganizationMembership = Depends(require_writable_workspace),
):
    organization_id = _org(actor, writable)
    order_ids = list(dict.fromkeys(payload.order_ids))
    try:
        order_uuids = [UUID(str(order_id)) for order_id in order_ids]
    except ValueError:
        raise HTTPException(status_code=422, detail='One or more order ids are invalid') from None
    orders = (
        db.execute(
            select(DeliveryOrder)
            .where(
                DeliveryOrder.organization_id == organization_id,
                DeliveryOrder.id.in_(order_uuids),
                DeliveryOrder.status == 'planned',
            )
            .with_for_update()
        )
        .scalars()
        .all()
    )
    by_id = {str(order.id): order for order in orders}
    if len(by_id) != len(order_ids):
        raise HTTPException(status_code=422, detail='One or more orders are not plannable')

    driver_ids = list(dict.fromkeys(vehicle.driver_id for vehicle in payload.vehicles))
    if len(driver_ids) != len(payload.vehicles):
        raise HTTPException(status_code=422, detail='Each vehicle must use a different driver')
    try:
        driver_uuids = [UUID(str(driver_id)) for driver_id in driver_ids]
    except ValueError:
        raise HTTPException(status_code=422, detail='One or more driver ids are invalid') from None
    drivers = (
        db.execute(
            select(Driver).where(
                Driver.organization_id == organization_id,
                Driver.id.in_(driver_uuids),
                Driver.status == 'active',
            )
        )
        .scalars()
        .all()
    )
    driver_by_id = {str(driver.id): driver for driver in drivers}
    if len(driver_by_id) != len(driver_ids):
        raise HTTPException(
            status_code=422,
            detail='One or more drivers are missing or inactive in this workspace',
        )

    customer_ids = {order.customer_id for order in orders}
    customers = (
        db.execute(
            select(Customer).where(
                Customer.organization_id == organization_id,
                Customer.id.in_(customer_ids),
            )
        )
        .scalars()
        .all()
    )
    customer_by_id = {customer.id: customer for customer in customers}
    if any(order.customer_id not in customer_by_id for order in orders):
        raise HTTPException(status_code=422, detail='A delivery order has no customer')

    start_time = payload.start_time or datetime.combine(
        payload.plan_date, time(8, 0), tzinfo=UTC
    )
    planned = plan_fleet_time_window_routes(
        start_label=payload.start_label,
        start_latitude=payload.start_latitude,
        start_longitude=payload.start_longitude,
        start_time=start_time,
        orders=[
            {
                'id': order.id,
                'order_no': order.order_no,
                'quantity_units': order.quantity_units,
                'priority': order.priority,
                'service_minutes': order.service_minutes,
                'window_start': order.window_start,
                'window_end': order.window_end,
                'latitude': customer_by_id[order.customer_id].latitude,
                'longitude': customer_by_id[order.customer_id].longitude,
            }
            for order in orders
        ],
        vehicles=[
            {
                'id': vehicle.driver_id,
                'driver_id': vehicle.driver_id,
                'vehicle_capacity_units': vehicle.vehicle_capacity_units,
                'max_stops': vehicle.max_stops,
                'average_speed_kmh': vehicle.average_speed_kmh,
            }
            for vehicle in payload.vehicles
        ],
    )
    if not planned['vehicles']:
        raise HTTPException(status_code=422, detail='No delivery orders fit this fleet')

    created_runs: list[DispatchRun] = []
    multiple_vehicles = len(planned['vehicles']) > 1
    for vehicle_plan in planned['vehicles']:
        driver_id = vehicle_plan['driver_id']
        driver = driver_by_id[driver_id]
        vehicle_plan_data = vehicle_plan['plan']
        vehicle = next(
            item for item in payload.vehicles if item.driver_id == driver_id
        )
        run = DispatchRun(
            organization_id=organization_id,
            route_name=_fleet_route_name(
                payload.route_name.strip(), driver.full_name, multiple_vehicles
            ),
            plan_date=payload.plan_date,
            start_label=payload.start_label,
            start_latitude=payload.start_latitude,
            start_longitude=payload.start_longitude,
            vehicle_capacity_units=vehicle.vehicle_capacity_units,
            max_stops=vehicle.max_stops,
            total_distance_km=vehicle_plan_data['total_distance_km'],
            estimated_duration_min=vehicle_plan_data['estimated_duration_min'],
            expected_cash_etb=sum(
                (by_id[stop['order_id']].cod_amount_etb for stop in vehicle_plan_data['stops']),
                Decimal('0.00'),
            ),
            status='planned',
            driver_id=driver.id,
            created_by_user_id=actor.id,
            stops_json=vehicle_plan_data['stops'],
            unassigned_json=[],
        )
        db.add(run)
        db.flush()
        for stop in vehicle_plan_data['stops']:
            order = by_id[stop['order_id']]
            order.dispatch_run_id = run.id
            order.driver_id = driver.id
            order.stop_sequence = stop['sequence']
            order.status = 'assigned'
        created_runs.append(run)

    record_audit_event(
        db,
        event_type='dispatch.fleet_planned',
        entity_type='dispatch_run',
        entity_id=str(created_runs[0].id),
        actor=actor,
        organization_id=str(organization_id),
        description=f'Planned {len(created_runs)} vehicle runs',
        payload={
            'run_ids': [str(run.id) for run in created_runs],
            'vehicle_count': len(created_runs),
            'order_count': sum(len(run.stops_json or []) for run in created_runs),
            'unassigned_count': len(planned['unassigned']),
        },
    )
    db.commit()
    for run in created_runs:
        db.refresh(run)
    return FleetDispatchPlanResponse(
        runs=[_run_detail(db, run) for run in created_runs],
        unassigned=planned['unassigned'],
    )


@router.get('/runs', response_model=list[DispatchRunRead])
def list_dispatch_runs(
    db: Session = Depends(get_db),
    membership: OrganizationMembership = Depends(get_current_membership),
    _: User = Depends(require_roles(UserRole.VIEWER, UserRole.OPERATOR, UserRole.ADMIN)),
):
    return (
        db.execute(
            select(DispatchRun)
            .where(DispatchRun.organization_id == membership.organization_id)
            .order_by(DispatchRun.created_at.desc())
            .limit(100)
        )
        .scalars()
        .all()
    )


@router.get('/runs/{run_id}', response_model=DispatchRunDetail)
def get_dispatch_run(
    run_id: str,
    db: Session = Depends(get_db),
    membership: OrganizationMembership = Depends(get_current_membership),
    _: User = Depends(require_roles(UserRole.VIEWER, UserRole.OPERATOR, UserRole.ADMIN)),
):
    run = organization_scoped_get(
        db,
        DispatchRun,
        run_id,
        membership.organization_id,
        not_found_detail='Dispatch run not found',
        include_legacy_null=False,
    )
    return _run_detail(db, run)


@router.post('/runs/{run_id}/driver-link', response_model=DriverLinkResponse)
def create_driver_link(
    run_id: str,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(UserRole.OPERATOR, UserRole.ADMIN)),
    writable: OrganizationMembership = Depends(require_writable_workspace),
):
    organization_id = _org(actor, writable)
    run = db.execute(
        select(DispatchRun)
        .where(
            DispatchRun.id == validate_uuid(run_id, detail='Invalid dispatch run identifier'),
            DispatchRun.organization_id == organization_id,
        )
        .with_for_update()
    ).scalar_one_or_none()
    if run is None:
        raise HTTPException(status_code=404, detail='Dispatch run not found')
    if run.driver_id is None:
        raise HTTPException(status_code=409, detail='Assign a driver before creating a driver link')
    driver = organization_scoped_get(
        db,
        Driver,
        run.driver_id,
        organization_id,
        not_found_detail='Driver not found',
        include_legacy_null=False,
    )
    if driver.status != 'active':
        raise HTTPException(status_code=409, detail='Driver is not active')
    expires_at = datetime.now(UTC) + timedelta(hours=12)
    token = jwt.encode(
        {
            'sub': str(driver.id),
            'org_id': str(organization_id),
            'run_id': str(run.id),
            'scope': 'driver_run',
            'iat': int(datetime.now(UTC).timestamp()),
            'exp': int(expires_at.timestamp()),
            'jti': uuid4().hex,
        },
        settings.effective_jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )
    return DriverLinkResponse(
        token=token,
        # Keep the capability in the fragment so it is not sent to the web
        # server, access logs, or third-party referrers during page load.
        driver_url=f'{settings.console_url.rstrip("/")}/driver#token={token}',
        expires_at=expires_at,
    )


@router.post('/runs/{run_id}/close-cash', response_model=CashCloseSummary)
def close_dispatch_cash(
    run_id: str,
    payload: CashCloseRequest | None = None,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(UserRole.ADMIN)),
    writable: OrganizationMembership = Depends(require_writable_workspace),
):
    organization_id = _org(actor, writable)
    run = db.execute(
        select(DispatchRun)
        .where(
            DispatchRun.id == validate_uuid(run_id, detail='Invalid dispatch run identifier'),
            DispatchRun.organization_id == organization_id,
        )
        .with_for_update()
    ).scalar_one_or_none()
    if run is None:
        raise HTTPException(status_code=404, detail='Dispatch run not found')
    if run.status == 'closed' or run.cash_closed_at is not None:
        raise HTTPException(status_code=409, detail='Cash is already closed for this run')
    orders = (
        db.execute(
            select(DeliveryOrder).where(
                DeliveryOrder.organization_id == organization_id,
                DeliveryOrder.dispatch_run_id == run.id,
            )
            .with_for_update()
        )
        .scalars()
        .all()
    )
    if not orders:
        raise HTTPException(status_code=409, detail='Dispatch run has no delivery orders')
    if any(order.status not in _TERMINAL_ORDER_STATUSES for order in orders):
        raise HTTPException(status_code=409, detail='All delivery orders must be terminal before cash close')
    # A failed or cancelled stop never creates a cash obligation. Only a
    # delivered stop contributes to the expected day-end cash position.
    expected = sum(
        (order.cod_amount_etb for order in orders if order.status == 'delivered'),
        Decimal('0.00'),
    )
    declared = sum(
        (order.collected_cash_etb or Decimal('0.00') for order in orders),
        Decimal('0.00'),
    )
    handed_over = (
        payload.handed_over_etb
        if payload is not None and payload.handed_over_etb is not None
        else declared
    )
    note = payload.note if payload is not None else None
    if (handed_over != expected or handed_over != declared) and not (note or '').strip():
        raise HTTPException(
            status_code=422,
            detail=(
                'A note is required when handed-over cash differs from '
                'expected or declared cash'
            ),
        )
    shortfall = max(expected - handed_over, Decimal('0.00'))
    overage = max(handed_over - expected, Decimal('0.00'))
    now = datetime.now(UTC)
    for order in orders:
        order.cash_settled_at = now
    run.status = 'closed'
    run.cash_closed_at = now
    run.cash_closed_by_user_id = actor.id
    run.cash_declared_etb = declared
    run.cash_handed_over_etb = handed_over
    run.cash_shortfall_etb = shortfall
    run.cash_overage_etb = overage
    run.cash_deposit_bank = payload.deposit_bank if payload is not None else None
    run.cash_deposit_reference = payload.deposit_reference if payload is not None else None
    run.cash_close_note = note
    record_audit_event(
        db,
        event_type='dispatch.cash_closed',
        entity_type='dispatch_run',
        entity_id=str(run.id),
        actor=actor,
        organization_id=str(organization_id),
        description=(
            f'Closed cash with {shortfall} ETB shortfall and {overage} ETB overage'
        ),
        payload={
            'expected_etb': str(expected),
            'collected_etb': str(declared),
            'declared_etb': str(declared),
            'handed_over_etb': str(handed_over),
            'shortfall_etb': str(shortfall),
            'overage_etb': str(overage),
            'deposit_bank': payload.deposit_bank if payload is not None else None,
            'deposit_reference': (
                payload.deposit_reference if payload is not None else None
            ),
            'note': note,
        },
    )
    db.commit()
    return CashCloseSummary(
        run_id=str(run.id),
        expected_etb=expected,
        collected_etb=declared,
        declared_etb=declared,
        handed_over_etb=handed_over,
        shortfall_etb=shortfall,
        overage_etb=overage,
        deposit_bank=payload.deposit_bank if payload is not None else None,
        deposit_reference=payload.deposit_reference if payload is not None else None,
        note=note,
        terminal_stops=len(orders),
        total_stops=len(orders),
        closed_at=now,
    )
