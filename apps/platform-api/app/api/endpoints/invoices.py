import io
import math
from decimal import Decimal

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.security import (
    get_current_membership,
    require_roles,
    require_writable_workspace,
    validate_uuid,
)
from app.core.config import settings
from app.db.session import get_db
from app.models.freight_invoice import FreightInvoice
from app.models.membership import OrganizationMembership
from app.models.order import HistoricalOrder
from app.models.user import User
from app.schemas.auth import UserRole
from app.schemas.invoice import FreightInvoiceRead

router = APIRouter()


@router.get('', response_model=list[FreightInvoiceRead])
def get_invoices(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    membership: OrganizationMembership = Depends(get_current_membership),
    _: User = Depends(require_roles(UserRole.VIEWER, UserRole.OPERATOR, UserRole.ADMIN)),
):
    rows = db.execute(
        select(FreightInvoice).where(
            FreightInvoice.organization_id == membership.organization_id
        )
        .order_by(FreightInvoice.created_at.desc(), FreightInvoice.id)
        .offset(skip)
        .limit(limit)
    ).scalars().all()
    return rows


@router.post('/upload', response_model=list[FreightInvoiceRead])
def upload_invoices(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.OPERATOR, UserRole.ADMIN)),
    writable: OrganizationMembership = Depends(require_writable_workspace),
):
    import pandas as pd

    if not file.filename or not file.filename.lower().endswith('.csv'):
        raise HTTPException(status_code=400, detail='Only CSV files are accepted')
    content = file.file.read(settings.csv_max_size_bytes + 1)
    if len(content) > settings.csv_max_size_bytes:
        raise HTTPException(status_code=413, detail='Invoice CSV is too large')
    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f'Invalid CSV: {exc}') from exc

    required = {'order_id', 'carrier_id', 'actual_rate'}
    missing = required.difference(df.columns)
    if missing:
        raise HTTPException(status_code=400, detail=f'Missing required columns: {sorted(missing)}')

    parsed_rows: list[tuple[str, str, Decimal]] = []
    for index, row in df.iterrows():
        row_number = index + 2
        raw_order_id = str(row['order_id']).strip()
        try:
            order_id = str(validate_uuid(raw_order_id, detail='Invalid order identifier'))
        except HTTPException:
            raise HTTPException(
                status_code=400,
                detail=f'Row {row_number}: order_id must be a UUID',
            ) from None

        raw_carrier_id = row['carrier_id']
        if pd.isna(raw_carrier_id):
            raise HTTPException(status_code=400, detail=f'Row {row_number}: carrier_id is required')
        carrier_id = str(raw_carrier_id).strip()
        if not carrier_id or carrier_id.casefold() == 'nan':
            raise HTTPException(status_code=400, detail=f'Row {row_number}: carrier_id is required')

        try:
            actual_rate_value = float(row['actual_rate'])
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail=f'Row {row_number}: actual_rate must be numeric') from None
        if not math.isfinite(actual_rate_value) or actual_rate_value < 0:
            raise HTTPException(
                status_code=400,
                detail=f'Row {row_number}: actual_rate must be finite and non-negative',
            )
        parsed_rows.append((order_id, carrier_id, Decimal(str(actual_rate_value))))

    orders_by_id: dict[str, HistoricalOrder] = {}
    if parsed_rows:
        order_ids = {order_id for order_id, _, _ in parsed_rows}
        orders = db.execute(
            select(HistoricalOrder).where(
                HistoricalOrder.id.in_(order_ids),
                HistoricalOrder.organization_id == writable.organization_id,
            )
        ).scalars().all()
        orders_by_id = {str(order.id): order for order in orders}

    results = []
    tolerance = Decimal('0.01')
    for order_id, carrier_id, actual_rate in parsed_rows:
        order = orders_by_id.get(order_id)
        if order is None:
            continue

        quoted_rate = Decimal(str(order.quantity)) * Decimal(str(order.unit_price))
        variance = actual_rate - quoted_rate
        status = 'matched' if abs(variance) <= tolerance else 'mismatch_flagged'

        invoice = FreightInvoice(
            organization_id=writable.organization_id,
            order_id=order_id,
            carrier_id=carrier_id,
            quoted_rate=float(quoted_rate),
            actual_rate=float(actual_rate),
            variance=float(variance),
            status=status,
        )
        db.add(invoice)
        results.append(invoice)

    db.commit()
    for inv in results:
        db.refresh(inv)

    return results
