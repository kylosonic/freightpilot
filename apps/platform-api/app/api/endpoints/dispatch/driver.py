from __future__ import annotations

import hashlib
from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, Response, UploadFile
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.endpoints.dispatch.common import (
    _PROOF_MAX_BYTES,
    _PROOF_TYPES,
    _TERMINAL_ORDER_STATUSES,
    _has_expected_image_signature,
    _order_in_org,
    _stops_for_run,
)
from app.api.security import (
    get_current_membership,
    organization_scoped_get,
    require_roles,
)
from app.core.config import settings
from app.db.session import get_db
from app.models.dispatch import Customer, DeliveryProof, DispatchRun
from app.models.driver import Driver
from app.models.membership import OrganizationMembership
from app.models.organization import Organization
from app.models.user import User
from app.schemas.auth import UserRole
from app.schemas.dispatch import (
    DeliveryProofRead,
    DispatchStopRead,
    DriverCashDeclare,
    DriverManifest,
    DriverStatusUpdate,
)
from app.services.audit import record_audit_event
from app.services.security import decode_access_token

router = APIRouter()


def _driver_context(
    x_driver_token: str = Header(default='', alias='X-Driver-Token'),
    db: Session = Depends(get_db),
) -> tuple[DispatchRun, Driver]:
    if not x_driver_token:
        raise HTTPException(status_code=401, detail='Driver token required')
    try:
        payload = decode_access_token(x_driver_token)
        if payload.get('scope') != 'driver_run':
            raise ValueError('wrong scope')
        organization_id = UUID(str(payload['org_id']))
        run_id = UUID(str(payload['run_id']))
        driver_id = UUID(str(payload['sub']))
    except (KeyError, TypeError, ValueError):
        raise HTTPException(status_code=401, detail='Invalid driver token') from None
    run = db.get(DispatchRun, run_id)
    driver = db.get(Driver, driver_id)
    organization = db.get(Organization, organization_id)
    if (
        organization is None
        or not organization.is_active
        or run is None
        or driver is None
        or run.organization_id != organization_id
        or driver.organization_id != organization_id
        or run.driver_id != driver.id
        or driver.status != 'active'
        or run.status == 'closed'
    ):
        raise HTTPException(status_code=403, detail='Driver access is not valid for this run')
    return run, driver


@router.get('/driver/manifest', response_model=DriverManifest)
def driver_manifest(
    context: tuple[DispatchRun, Driver] = Depends(_driver_context),
    db: Session = Depends(get_db),
):
    run, driver = context
    return DriverManifest(
        run_id=str(run.id),
        route_name=run.route_name,
        plan_date=run.plan_date,
        driver_id=str(driver.id),
        driver_name=driver.full_name,
        start_label=run.start_label,
        stops=_stops_for_run(db, run),
    )


@router.post('/driver/orders/{order_id}/status', response_model=DispatchStopRead)
def driver_update_status(
    order_id: str,
    payload: DriverStatusUpdate,
    context: tuple[DispatchRun, Driver] = Depends(_driver_context),
    db: Session = Depends(get_db),
):
    run, driver = context
    order = _order_in_org(db, run.organization_id, order_id)
    if order.dispatch_run_id != run.id or order.driver_id != driver.id:
        raise HTTPException(status_code=404, detail='Delivery order not found')
    if order.status in {'cancelled', 'delivered'}:
        raise HTTPException(status_code=409, detail='This delivery is already terminal')
    if payload.status == 'failed' and order.cash_declared_at is not None:
        raise HTTPException(
            status_code=409,
            detail=(
                'Cash was already declared. Complete delivery or '
                'reverse the cash record before failing it.'
            ),
        )
    order.status = payload.status
    order.completed_at = datetime.now(UTC) if payload.status in _TERMINAL_ORDER_STATUSES else None
    if payload.note:
        order.notes = payload.note
    record_audit_event(
        db,
        event_type='dispatch.driver_status',
        entity_type='delivery_order',
        entity_id=str(order.id),
        organization_id=str(run.organization_id),
        description=f'Driver marked delivery {order.order_no} as {payload.status}',
        payload={'status': payload.status, 'driver_id': str(driver.id), 'note': payload.note},
    )
    db.commit()
    db.refresh(order)
    customer = db.get(Customer, order.customer_id)
    assert customer is not None
    stops = _stops_for_run(db, run)
    return next(stop for stop in stops if stop.order_id == str(order.id))


@router.post('/driver/orders/{order_id}/cash', response_model=DispatchStopRead)
def driver_declare_cash(
    order_id: str,
    payload: DriverCashDeclare,
    context: tuple[DispatchRun, Driver] = Depends(_driver_context),
    db: Session = Depends(get_db),
):
    run, driver = context
    order = _order_in_org(db, run.organization_id, order_id)
    if order.dispatch_run_id != run.id or order.driver_id != driver.id:
        raise HTTPException(status_code=404, detail='Delivery order not found')
    if order.status not in {'in_transit', 'delivered'}:
        raise HTTPException(status_code=409, detail='Cash is declared at delivery or in transit')
    if payload.collected_etb > order.cod_amount_etb:
        raise HTTPException(
            status_code=422,
            detail='Collected cash cannot exceed the cash-on-delivery amount',
        )
    if payload.collected_etb < order.cod_amount_etb and not (payload.note or '').strip():
        raise HTTPException(
            status_code=422,
            detail='A note is required when declaring less than the expected cash',
        )
    order.collected_cash_etb = payload.collected_etb
    order.cash_declared_at = datetime.now(UTC)
    order.cash_note = payload.note
    record_audit_event(
        db,
        event_type='dispatch.cash_declared',
        entity_type='delivery_order',
        entity_id=str(order.id),
        organization_id=str(run.organization_id),
        description=f'Driver declared {payload.collected_etb} ETB for {order.order_no}',
        payload={'collected_etb': str(payload.collected_etb), 'note': payload.note},
    )
    db.commit()
    db.refresh(order)
    stops = _stops_for_run(db, run)
    return next(stop for stop in stops if stop.order_id == str(order.id))


@router.post('/driver/orders/{order_id}/proof', response_model=DeliveryProofRead, status_code=201)
def driver_upload_proof(
    order_id: str,
    file: UploadFile = File(...),
    recipient_name: str | None = Form(default=None),
    notes: str | None = Form(default=None),
    proof_kind: str = Form(default='photo'),
    context: tuple[DispatchRun, Driver] = Depends(_driver_context),
    db: Session = Depends(get_db),
):
    run, driver = context
    order = _order_in_org(db, run.organization_id, order_id)
    if order.dispatch_run_id != run.id or order.driver_id != driver.id:
        raise HTTPException(status_code=404, detail='Delivery order not found')
    if file.content_type not in _PROOF_TYPES:
        raise HTTPException(status_code=415, detail='Proof must be a JPEG, PNG, or WebP image')
    content = file.file.read(_PROOF_MAX_BYTES + 1)
    if not content or len(content) > _PROOF_MAX_BYTES:
        raise HTTPException(status_code=413, detail='Proof image is too large')
    if not _has_expected_image_signature(content, file.content_type or ''):
        raise HTTPException(status_code=415, detail='Proof content does not match the declared image type')
    db.execute(
        select(Organization)
        .where(Organization.id == run.organization_id)
        .with_for_update()
    ).scalar_one()
    used_bytes = db.execute(
        select(
            func.coalesce(func.sum(func.length(DeliveryProof.file_data)), 0)
        ).where(DeliveryProof.organization_id == run.organization_id)
    ).scalar_one()
    if used_bytes + len(content) > settings.proof_org_quota_bytes:
        raise HTTPException(
            status_code=413,
            detail='Workspace proof storage is full',
        )
    existing_proofs = db.execute(
        select(func.count(DeliveryProof.id)).where(
            DeliveryProof.organization_id == run.organization_id,
            DeliveryProof.delivery_order_id == order.id,
        )
    ).scalar_one()
    if existing_proofs >= 5:
        raise HTTPException(
            status_code=409,
            detail='This delivery already has the maximum number of proofs',
        )
    proof = DeliveryProof(
        organization_id=run.organization_id,
        delivery_order_id=order.id,
        proof_sequence=existing_proofs + 1,
        proof_kind=proof_kind.strip()[:16] or 'photo',
        content_type=file.content_type,
        file_data=content,
        file_sha256=hashlib.sha256(content).hexdigest(),
        recipient_name=recipient_name,
        notes=notes,
        captured_at=datetime.now(UTC),
    )
    db.add(proof)
    try:
        db.flush()
        record_audit_event(
            db,
            event_type='dispatch.proof_uploaded',
            entity_type='delivery_order',
            entity_id=str(order.id),
            organization_id=str(run.organization_id),
            description=f'Proof uploaded for {order.order_no}',
            payload={'proof_kind': proof.proof_kind, 'content_type': proof.content_type},
        )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail='This delivery already has the maximum number of proofs',
        ) from None
    db.refresh(proof)
    return DeliveryProofRead.model_validate(proof)


@router.get('/orders/{order_id}/proofs', response_model=list[DeliveryProofRead])
def list_order_proofs(
    order_id: str,
    db: Session = Depends(get_db),
    membership: OrganizationMembership = Depends(get_current_membership),
    _: User = Depends(require_roles(UserRole.VIEWER, UserRole.OPERATOR, UserRole.ADMIN)),
):
    order = _order_in_org(db, membership.organization_id, order_id)
    return (
        db.execute(
            select(DeliveryProof)
            .where(
                DeliveryProof.organization_id == membership.organization_id,
                DeliveryProof.delivery_order_id == order.id,
            )
            .order_by(DeliveryProof.captured_at.desc())
        )
        .scalars()
        .all()
    )


@router.get('/orders/{order_id}/proofs/{proof_id}/file')
def get_order_proof_file(
    order_id: str,
    proof_id: str,
    db: Session = Depends(get_db),
    membership: OrganizationMembership = Depends(get_current_membership),
    _: User = Depends(require_roles(UserRole.VIEWER, UserRole.OPERATOR, UserRole.ADMIN)),
):
    order = _order_in_org(db, membership.organization_id, order_id)
    proof = organization_scoped_get(
        db,
        DeliveryProof,
        proof_id,
        membership.organization_id,
        not_found_detail='Delivery proof not found',
        include_legacy_null=False,
    )
    if proof.delivery_order_id != order.id:
        raise HTTPException(status_code=404, detail='Delivery proof not found')
    extension = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
    }.get(proof.content_type, 'bin')
    return Response(
        content=proof.file_data,
        media_type=proof.content_type,
        headers={
            'Content-Disposition': f'inline; filename="proof-{proof.id}.{extension}"',
            'Cache-Control': 'private, no-store',
            'X-Content-Type-Options': 'nosniff',
        },
    )
