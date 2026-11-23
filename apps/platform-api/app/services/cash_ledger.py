"""Cash-on-delivery reconciliation (NB-86).

Kept as a service rather than inlined in the endpoints because three callers need
identical arithmetic: the delivery confirmation on ``/shipments/{id}/status``, the
driver's declaration, and the office settlement. A shortfall computed three
different ways would eventually disagree with itself, and this is money.
"""

from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.cash_collection import CashCollection
from app.models.driver import Driver
from app.models.shipment import Shipment

ZERO = Decimal('0.00')


def compute_shortfall(expected: Decimal | None, collected: Decimal | None) -> Decimal:
    """How much of the expected cash did not arrive.

    Floored at zero: over-collection is not a negative shortfall, it is a
    separately visible surplus (``collected_etb > expected_etb``), and the DB
    check constraint forbids a negative value on this column.
    """
    expected = expected or ZERO
    collected = collected or ZERO
    shortfall = expected - collected
    return shortfall if shortfall > ZERO else ZERO


def get_by_shipment(db: Session, shipment_id: UUID) -> CashCollection | None:
    return db.execute(
        select(CashCollection).where(CashCollection.shipment_id == shipment_id)
    ).scalar_one_or_none()


def open_for_shipment(
    db: Session,
    shipment: Shipment,
    *,
    collected: Decimal | None = None,
    note: str | None = None,
    collected_at: datetime | None = None,
) -> CashCollection:
    """Open (or update) the cash record for a shipment that was delivered.

    Idempotent by design. The unique constraint on ``shipment_id`` means a
    replayed delivery confirmation updates the existing row instead of opening a
    second one — which is the whole point on a connection that drops mid-request.
    """
    expected = shipment.cod_amount_etb or ZERO
    record = get_by_shipment(db, shipment.id)

    if record is None:
        try:
            with db.begin_nested():
                record = CashCollection(
                    organization_id=shipment.organization_id,
                    shipment_id=shipment.id,
                    driver_id=shipment.driver_id,
                    expected_etb=expected,
                    collected_etb=ZERO,
                    shortfall_etb=expected,
                    status='outstanding',
                )
                db.add(record)
                db.flush()
        except IntegrityError:
            record = get_by_shipment(db, shipment.id)
            if record is None:
                raise

    # A shipment that already settled must not be silently reopened by a retry.
    if record.status in {'settled', 'voided'}:
        return record

    # The driver may have changed since the record was opened; keep it current.
    if record.driver_id != shipment.driver_id:
        record.driver_id = shipment.driver_id

    if collected is not None:
        record.collected_etb = collected
        record.shortfall_etb = compute_shortfall(record.expected_etb, collected)
        record.status = 'collected'
        record.collected_at = collected_at or datetime.now(UTC)
        if note is not None:
            record.note = note
    elif record.status == 'outstanding':
        # No cash figure yet: the full expected amount is still with the driver.
        record.shortfall_etb = record.expected_etb

    db.add(record)
    return record


def declare(
    db: Session,
    record: CashCollection,
    *,
    collected: Decimal,
    note: str | None = None,
) -> CashCollection:
    """Record what the driver says they are holding."""
    if record.status == 'voided':
        raise ValueError('This cash record was voided')
    if record.status == 'settled':
        raise ValueError('This cash record is already settled')
    if collected < ZERO:
        raise ValueError('Collected cash cannot be negative')
    if collected > record.expected_etb:
        raise ValueError('Collected cash cannot exceed the expected cash amount')
    record.collected_etb = collected
    record.shortfall_etb = compute_shortfall(record.expected_etb, collected)
    record.status = 'collected'
    record.collected_at = datetime.now(UTC)
    if note is not None:
        record.note = note
    db.add(record)
    return record


def settle(
    db: Session,
    record: CashCollection,
    *,
    settled_by: UUID | None,
    note: str | None = None,
) -> CashCollection:
    """The office has the cash in hand; close the record.

    Any remaining shortfall stays on the row as the permanent record of what was
    written off — it is deliberately not zeroed, because a written-off shortfall
    is exactly the number an operator needs at month end.
    """
    if record.status == 'voided':
        raise ValueError('This cash record was voided')
    if record.status == 'settled':
        return record
    record.status = 'settled'
    record.settled_at = datetime.now(UTC)
    record.settled_by_id = settled_by
    if note is not None:
        record.note = note
    db.add(record)
    return record


def _serialize_records(
    records: list[CashCollection],
    *,
    drivers_by_id: dict[UUID, Driver],
    shipments_by_id: dict[UUID, Shipment],
    supplied_shipments: dict[UUID, Shipment] | None = None,
) -> list[dict]:
    supplied_shipments = supplied_shipments or {}
    rows: list[dict] = []
    for record in records:
        driver = drivers_by_id.get(record.driver_id) if record.driver_id else None
        shipment = supplied_shipments.get(record.shipment_id) or shipments_by_id.get(record.shipment_id)
        rows.append(
            {
                'id': record.id,
                'created_at': record.created_at,
                'shipment_id': record.shipment_id,
                'shipment_no': shipment.shipment_no if shipment else 'unknown',
                'driver_id': record.driver_id,
                'driver_name': driver.full_name if driver else None,
                'expected_etb': record.expected_etb,
                'collected_etb': record.collected_etb,
                'shortfall_etb': record.shortfall_etb,
                'status': record.status,
                'collected_at': record.collected_at,
                'settled_at': record.settled_at,
                'note': record.note,
            }
        )
    return rows


def serialize_many(db: Session, records: list[CashCollection]) -> list[dict]:
    if not records:
        return []
    driver_ids = {record.driver_id for record in records if record.driver_id is not None}
    shipment_ids = {record.shipment_id for record in records if record.shipment_id is not None}
    drivers = (
        db.execute(select(Driver).where(Driver.id.in_(driver_ids))).scalars().all()
        if driver_ids
        else []
    )
    shipments = (
        db.execute(select(Shipment).where(Shipment.id.in_(shipment_ids))).scalars().all()
        if shipment_ids
        else []
    )
    return _serialize_records(
        records,
        drivers_by_id={driver.id: driver for driver in drivers},
        shipments_by_id={shipment.id: shipment for shipment in shipments},
    )


def serialize(db: Session, record: CashCollection, shipment: Shipment | None = None) -> dict:
    """Shape one cash record for the API without scanning the ledger."""
    supplied = {shipment.id: shipment} if shipment is not None else {}
    driver = db.get(Driver, record.driver_id) if record.driver_id is not None else None
    owner = shipment or db.get(Shipment, record.shipment_id)
    return _serialize_records(
        [record],
        drivers_by_id={driver.id: driver} if driver else {},
        shipments_by_id={owner.id: owner} if owner else {},
        supplied_shipments=supplied,
    )[0]
