from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.security import organization_scoped_get, resolve_scoped_organization
from app.models.dispatch import (
    Customer,
    DeliveryOrder,
    DeliveryProof,
    DispatchRun,
)
from app.models.membership import OrganizationMembership
from app.models.user import User
from app.schemas.dispatch import (
    CustomerRead,
    DeliveryOrderRead,
    DispatchRunDetail,
    DispatchRunRead,
    DispatchStopRead,
)

_PROOF_MAX_BYTES = 4 * 1024 * 1024
_PROOF_TYPES = {'image/jpeg', 'image/png', 'image/webp'}
_TERMINAL_ORDER_STATUSES = {'delivered', 'failed', 'cancelled'}
_CUSTOMER_TRACKING_HOURS = 72


def _has_expected_image_signature(content: bytes, content_type: str) -> bool:
    if content_type == 'image/jpeg':
        return content.startswith(b'\xff\xd8\xff')
    if content_type == 'image/png':
        return content.startswith(b'\x89PNG\r\n\x1a\n')
    if content_type == 'image/webp':
        return (
            len(content) >= 12
            and content.startswith(b'RIFF')
            and content[8:12] == b'WEBP'
        )
    return False


def _org(actor: User, writable: OrganizationMembership | None) -> UUID:
    return resolve_scoped_organization(actor, writable)


def _customer_read(customer: Customer) -> CustomerRead:
    return CustomerRead.model_validate(customer)


def _order_read(order: DeliveryOrder, customer: Customer | None) -> DeliveryOrderRead:
    return DeliveryOrderRead(
        id=str(order.id),
        created_at=order.created_at,
        order_no=order.order_no,
        customer_id=str(order.customer_id),
        customer_code=customer.code if customer else None,
        customer_name=customer.name if customer else None,
        item_id=str(order.item_id) if order.item_id else None,
        dispatch_run_id=str(order.dispatch_run_id) if order.dispatch_run_id else None,
        driver_id=str(order.driver_id) if order.driver_id else None,
        quantity_units=order.quantity_units,
        cod_amount_etb=order.cod_amount_etb,
        window_start=order.window_start,
        window_end=order.window_end,
        service_minutes=order.service_minutes,
        priority=order.priority,
        stop_sequence=order.stop_sequence,
        status=order.status,
        completed_at=order.completed_at,
        collected_cash_etb=order.collected_cash_etb,
        cash_declared_at=order.cash_declared_at,
        cash_settled_at=order.cash_settled_at,
        cash_note=order.cash_note,
        notes=order.notes,
    )


def _run_read(run: DispatchRun) -> DispatchRunRead:
    return DispatchRunRead.model_validate(run)


def _stops_for_run(db: Session, run: DispatchRun) -> list[DispatchStopRead]:
    stop_data = run.stops_json or []
    order_ids = [UUID(str(item['order_id'])) for item in stop_data]
    if not order_ids:
        return []
    rows = db.execute(
        select(DeliveryOrder, Customer)
        .join(
            Customer,
            (Customer.id == DeliveryOrder.customer_id)
            & (Customer.organization_id == run.organization_id),
        )
        .where(
            DeliveryOrder.organization_id == run.organization_id,
            DeliveryOrder.id.in_(order_ids),
        )
    ).all()
    by_id = {str(order.id): (order, customer) for order, customer in rows}
    proofs = (
        db.execute(
            select(DeliveryProof)
            .where(
                DeliveryProof.organization_id == run.organization_id,
                DeliveryProof.delivery_order_id.in_(order_ids),
            )
            .order_by(DeliveryProof.captured_at.desc())
        )
        .scalars()
        .all()
    )
    proof_by_order: dict[str, str] = {}
    for proof in proofs:
        proof_by_order.setdefault(str(proof.delivery_order_id), str(proof.id))

    stops: list[DispatchStopRead] = []
    for item in stop_data:
        found = by_id.get(str(item['order_id']))
        if found is None:
            continue
        order, customer = found
        stops.append(
            DispatchStopRead(
                order_id=str(order.id),
                order_no=order.order_no,
                customer_code=customer.code,
                customer_name=customer.name,
                address=customer.address,
                phone=customer.phone,
                latitude=customer.latitude,
                longitude=customer.longitude,
                sequence=item['sequence'],
                planned_arrival=datetime.fromisoformat(item['planned_arrival']),
                window_start=order.window_start,
                window_end=order.window_end,
                demand_units=order.quantity_units,
                cod_amount_etb=order.cod_amount_etb,
                status=order.status,
                completed_at=order.completed_at,
                collected_cash_etb=order.collected_cash_etb,
                proof_id=proof_by_order.get(str(order.id)),
            )
        )
    return sorted(stops, key=lambda stop: stop.sequence)


def _run_detail(db: Session, run: DispatchRun) -> DispatchRunDetail:
    return DispatchRunDetail(
        **_run_read(run).model_dump(),
        stops=_stops_for_run(db, run),
        unassigned=run.unassigned_json or [],
    )


def _fleet_route_name(base_name: str, driver_name: str, multiple_vehicles: bool) -> str:
    if not multiple_vehicles:
        return base_name
    suffix = f' - {driver_name}'
    return f'{base_name[: max(1, 128 - len(suffix))]}{suffix}'[:128]


def _customer_in_org(db: Session, organization_id: UUID, customer_id: str) -> Customer:
    return organization_scoped_get(
        db,
        Customer,
        customer_id,
        organization_id,
        not_found_detail='Customer not found',
        include_legacy_null=False,
    )


def _order_in_org(db: Session, organization_id: UUID, order_id: str) -> DeliveryOrder:
    return organization_scoped_get(
        db,
        DeliveryOrder,
        order_id,
        organization_id,
        not_found_detail='Delivery order not found',
        include_legacy_null=False,
    )
