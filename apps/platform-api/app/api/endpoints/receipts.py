"""Receipt endpoints (TECH-07..17) — prefix ``/receipts``.

WRITE-GUARD EXEMPTION (blueprint decision #1 — deliberate carve-out, not an
omission): upload, dispute, queue-read, verdict-render and wallet endpoints
do NOT include ``Depends(require_writable_workspace)``. They use
``get_current_membership`` (customer surfaces) or
``require_org_roles(OWNER, ADMIN)`` (admin surfaces) only. A hard-locked
workspace MUST remain payable — that is the feature's purpose.

Services never import this module (one-directional chain preserved).
"""

from __future__ import annotations

import json
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.security import (
    get_current_membership,
    require_org_roles,
    require_platform_admin,
    validate_uuid,
)
from app.db.session import get_db
from app.models.membership import OrganizationMembership
from app.models.organization import Organization
from app.models.payment_receipt import PaymentReceipt
from app.models.user import User
from app.schemas.auth import OrganizationRole
from app.schemas.receipts import (
    DisputeRequest,
    ReceiptQueueItemRead,
    ReceiptRead,
    ReceiptUploadResponse,
    VerdictRequest,
    WalletCreditRead,
    WalletRead,
)
from app.services.billing import lifecycle
from app.services.billing import receipts as receipts_service
from app.services.billing.receipts import (
    NO_OPEN_INVOICE_MESSAGE,
    UNSUPPORTED_FORMAT_MESSAGE,
    UPLOAD_CONFIRMATION_MESSAGE,
    ReceiptVerdictError,
)

router = APIRouter()


def _matches_receipt_signature(content_type: str, data: bytes) -> bool:
    signatures = {
        'image/png': (b'\x89PNG\r\n\x1a\n',),
        'image/jpeg': (b'\xff\xd8\xff',),
        'application/pdf': (b'%PDF-',),
    }
    return any(data.startswith(signature) for signature in signatures.get(content_type, ()))


def _receipt_read(receipt) -> ReceiptRead:
    return ReceiptRead(
        id=receipt.id,
        status=receipt.status,
        verdict=receipt.verdict,
        invoice_number=receipt.invoice.invoice_number if receipt.invoice else None,
        reference_number=receipt.reference_number,
        amount_etb=receipt.amount_etb,
        sender_name=receipt.sender_name,
        bank_code=receipt.bank_code,
        rejection_reason=receipt.rejection_reason,
        created_at=receipt.created_at,
        decided_at=receipt.decided_at,
        reversal_status=receipt.reversal_status,
    )


def _queue_item(db: Session, receipt) -> ReceiptQueueItemRead:
    return ReceiptQueueItemRead(**receipts_service.queue_item_payload(db, receipt))


def _queue_items(db: Session, receipts) -> list[ReceiptQueueItemRead]:
    return [
        ReceiptQueueItemRead(**payload)
        for payload in receipts_service.queue_item_payloads(db, receipts)
    ]


def _as_verdict_http(exc: ReceiptVerdictError) -> HTTPException:
    return HTTPException(status_code=exc.status_code, detail=exc.message)


@router.post('/upload', response_model=ReceiptUploadResponse)
def upload_receipt_endpoint(
    file: UploadFile = File(...),
    mock_extraction: str | None = Form(default=None),
    db: Session = Depends(get_db),
    membership: OrganizationMembership = Depends(
        require_org_roles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
    ),
):
    """Customer upload (any billing phase — write-guard EXEMPT).

    Format/size validation (NB-07.5), then a workspace-state refresh FIRST
    (materializes any lazily-issued invoice so routing sees it), then the
    receipt pipeline. No open invoice -> 400 (free orgs have none).
    """
    from app.core.config import settings

    max_bytes = settings.receipt_max_size_bytes
    file_bytes = file.file.read(max_bytes + 1) if file.file else b''
    ext = file.filename.rsplit('.', 1)[-1].lower() if file.filename else ''
    if ext not in {'png', 'jpg', 'jpeg', 'pdf'} or file.content_type not in {
        'image/png',
        'image/jpeg',
        'application/pdf',
    }:
        raise HTTPException(status_code=400, detail=UNSUPPORTED_FORMAT_MESSAGE)
    if len(file_bytes) > max_bytes:
        raise HTTPException(status_code=400, detail='Receipt too large — maximum 5 MB.')
    if not _matches_receipt_signature(file.content_type or '', file_bytes):
        raise HTTPException(status_code=415, detail='Receipt content does not match the declared file type.')

    # Serialize quota admission per workspace. Without this lock, concurrent
    # uploads can both observe spare capacity and exceed the configured quota.
    org = db.execute(
        select(Organization)
        .where(Organization.id == membership.organization_id)
        .with_for_update()
    ).scalar_one_or_none()
    if org is None:
        raise HTTPException(status_code=404, detail='Organization not found')

    used_bytes, pending_count = db.execute(
        select(
            func.coalesce(func.sum(PaymentReceipt.file_size_bytes), 0),
            func.count(PaymentReceipt.id).filter(PaymentReceipt.status.in_(['pending', 'escalated'])),
        ).where(PaymentReceipt.organization_id == org.id)
    ).one()
    if int(used_bytes) + len(file_bytes) > settings.receipt_org_quota_bytes:
        raise HTTPException(status_code=413, detail='This workspace has reached its receipt storage limit.')
    if int(pending_count) >= settings.receipt_pending_limit:
        raise HTTPException(
            status_code=429,
            detail='Too many receipts are waiting for review. Please wait for a decision.',
        )

    lifecycle.refresh_workspace_state(db, org, datetime.now(UTC))

    sidecar = None
    if settings.receipt_extraction_mode == 'mock' and mock_extraction:
        try:
            sidecar = json.loads(mock_extraction)
        except json.JSONDecodeError:
            sidecar = None

    receipt = receipts_service.upload_receipt(
        db,
        org,
        file_name=file.filename or 'receipt',
        content_type=file.content_type or 'application/octet-stream',
        file_bytes=file_bytes,
        user=db.get(User, membership.user_id),
        mock_extraction=sidecar,
    )
    # Routeability gate BEFORE commit (blueprint risk note 8): an unrouteable
    # upload (no open invoice) rolls back entirely — no row, no extraction,
    # no audit, and crucially NO queue item. A committed pending receipt with
    # invoice_id=None would be an unverifiable zombie in the admin queue.
    if receipt.status == 'pending' and receipt.invoice_id is None:
        db.rollback()
        raise HTTPException(status_code=400, detail=NO_OPEN_INVOICE_MESSAGE)
    db.commit()
    # Duplicate hard-rejects are a NORMAL upload outcome (200 + confirmation;
    # the NB-14.3 rejection banner notifies the customer). HTTP 400 is
    # reserved for genuinely unrouteable uploads (no open invoice).
    return ReceiptUploadResponse(message=UPLOAD_CONFIRMATION_MESSAGE, receipt_id=str(receipt.id))


@router.get('', response_model=list[ReceiptRead])
def list_customer_receipts(
    db: Session = Depends(get_db),
    membership: OrganizationMembership = Depends(get_current_membership),
):
    """Customer receipt history, newest first. Write-guard EXEMPT (must be
    viewable while locked)."""
    org = db.get(Organization, membership.organization_id)
    if org is None:
        raise HTTPException(status_code=404, detail='Organization not found')
    rows = receipts_service.list_customer_receipts(db, org)
    return [_receipt_read(row) for row in rows]


@router.get('/wallet', response_model=WalletRead)
def customer_wallet(
    db: Session = Depends(get_db),
    membership: OrganizationMembership = Depends(get_current_membership),
):
    """Wallet balance + credit history. Write-guard EXEMPT."""
    org = db.get(Organization, membership.organization_id)
    if org is None:
        raise HTTPException(status_code=404, detail='Organization not found')
    available, rows = receipts_service.list_wallet(db, org)
    return WalletRead(
        available_etb=available,
        credits=[
            WalletCreditRead(
                amount_etb=row.amount_etb,
                status=row.status,
                applied_to_invoice_number=row.applied_to_invoice.invoice_number
                if row.applied_to_invoice
                else None,
                created_at=row.created_at,
            )
            for row in rows
        ],
    )


@router.post('/{receipt_id}/dispute', response_model=ReceiptRead)
def submit_dispute_endpoint(
    receipt_id: str,
    payload: DisputeRequest,
    db: Session = Depends(get_db),
    membership: OrganizationMembership = Depends(
        require_org_roles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
    ),
):
    """Customer dispute (NB-17). Write-guard EXEMPT."""
    receipt_uuid = validate_uuid(receipt_id, detail='Receipt not found')
    org = db.get(Organization, membership.organization_id)
    if org is None:
        raise HTTPException(status_code=404, detail='Organization not found')
    user = db.get(User, membership.user_id)
    try:
        receipts_service.submit_dispute(db, org, user, str(receipt_uuid), payload.text.strip())
    except ReceiptVerdictError as exc:
        raise _as_verdict_http(exc) from None
    db.commit()  # get_db closes without commit; refresh only commits on phase change
    receipt = db.get(PaymentReceipt, receipt_uuid)
    return _receipt_read(receipt)


@router.get('/queue', response_model=list[ReceiptQueueItemRead])
def receipt_queue(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_platform_admin),
):
    """Admin verification queue (pending + escalated, oldest first).
    Write-guard EXEMPT — locked workspaces must still be serviced."""
    return _queue_items(db, receipts_service.list_queue(db))


@router.get('/queue/{receipt_id}', response_model=ReceiptQueueItemRead)
def receipt_queue_item(
    receipt_id: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_platform_admin),
):
    receipt_uuid = validate_uuid(receipt_id, detail='Receipt not found')
    receipt = receipts_service.get_queue_item(db, str(receipt_uuid))
    if receipt is None:
        raise HTTPException(status_code=404, detail='Receipt not found')
    return _queue_item(db, receipt)


@router.get('/queue/{receipt_id}/file')
def receipt_queue_file(
    receipt_id: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_platform_admin),
):
    """Raw receipt bytes for the admin detail panel (DB blob re-display)."""
    receipt_uuid = validate_uuid(receipt_id, detail='Receipt not found')
    receipt = receipts_service.get_queue_item(db, str(receipt_uuid))
    if receipt is None:
        raise HTTPException(status_code=404, detail='Receipt not found')
    # the stored content_type is client-supplied. Force a
    # download disposition so a crafted type can never be rendered in the
    # console origin (nosniff is already set globally).
    return Response(
        content=receipt.file_data,
        media_type=receipt.content_type,
        headers={
            'Content-Disposition': f'attachment; filename="{receipt.id}.bin"',
        },
    )


@router.post('/{receipt_id}/decision', response_model=ReceiptRead)
def render_decision_endpoint(
    receipt_id: str,
    payload: VerdictRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_platform_admin),
):
    """Admin verdict render (verify / reject_* / escalate) — write-guard
    EXEMPT. When the receipt has an open dispute, the same endpoint routes
    through dispute-resolution semantics (verify -> credit path;
    any rejection -> maintain_rejection)."""
    receipt_uuid = validate_uuid(receipt_id, detail='Receipt not found')
    target = db.get(PaymentReceipt, receipt_uuid)
    if target is None:
        raise HTTPException(status_code=404, detail='Receipt not found')
    try:
        if receipts_service.has_open_dispute(
            db, str(receipt_uuid), target.organization_id
        ):
            receipt = receipts_service.resolve_dispute(
                db, user, str(receipt_uuid), payload, target.organization_id
            )
        else:
            receipt = receipts_service.render_verdict(
                db, user, str(receipt_uuid), payload, target.organization_id
            )
    except ReceiptVerdictError as exc:
        raise _as_verdict_http(exc) from None
    db.commit()  # persist when the unlock refresh did not commit (phase unchanged)
    return _receipt_read(receipt)
