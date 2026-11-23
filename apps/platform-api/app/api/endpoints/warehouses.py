from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.security import (
    get_current_membership,
    require_roles,
    require_writable_workspace,
    validate_uuid,
)
from app.db.session import get_db
from app.models.membership import OrganizationMembership
from app.models.user import User
from app.models.warehouse import Warehouse
from app.schemas.auth import UserRole
from app.schemas.warehouse import WarehouseCreate, WarehouseRead, WarehouseUpdate

router = APIRouter()


@router.get('', response_model=list[WarehouseRead])
def list_warehouses(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    membership: OrganizationMembership = Depends(get_current_membership),
    _: User = Depends(require_roles(UserRole.VIEWER, UserRole.OPERATOR, UserRole.ADMIN)),
):
    query = select(Warehouse).where(
        Warehouse.organization_id == membership.organization_id
    )
    rows = (
        db.execute(query.order_by(Warehouse.code, Warehouse.id).offset(skip).limit(limit))
        .scalars()
        .all()
    )
    return rows


@router.post('', response_model=WarehouseRead, status_code=201)
def create_warehouse(
    payload: WarehouseCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.OPERATOR, UserRole.ADMIN)),
    writable: OrganizationMembership = Depends(require_writable_workspace),
):

    exists_query = select(Warehouse).where(
        Warehouse.code == payload.code,
        Warehouse.organization_id == writable.organization_id,
    )
    exists = db.execute(exists_query).scalar_one_or_none()
    if exists:
        raise HTTPException(status_code=409, detail='Warehouse code already exists')

    warehouse = Warehouse(
        **payload.model_dump(),
        organization_id=writable.organization_id,
    )
    db.add(warehouse)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail='Warehouse code already exists') from None
    db.refresh(warehouse)
    return warehouse


@router.get('/{warehouse_id}', response_model=WarehouseRead)
def get_warehouse(
    warehouse_id: str,
    db: Session = Depends(get_db),
    membership: OrganizationMembership = Depends(get_current_membership),
    _: User = Depends(require_roles(UserRole.VIEWER, UserRole.OPERATOR, UserRole.ADMIN)),
):
    warehouse_uuid = validate_uuid(warehouse_id, detail='Warehouse not found')
    row = db.execute(
        select(Warehouse).where(
            Warehouse.id == warehouse_uuid,
            Warehouse.organization_id == membership.organization_id,
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail='Warehouse not found')
    return row


@router.patch('/{warehouse_id}', response_model=WarehouseRead)
def update_warehouse(
    warehouse_id: str,
    payload: WarehouseUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.OPERATOR, UserRole.ADMIN)),
    writable: OrganizationMembership = Depends(require_writable_workspace),
):

    warehouse_uuid = validate_uuid(warehouse_id, detail='Warehouse not found')
    row = db.execute(
        select(Warehouse).where(
            Warehouse.id == warehouse_uuid,
            Warehouse.organization_id == writable.organization_id,
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail='Warehouse not found')

    for key, value in payload.model_dump(exclude_none=True).items():
        setattr(row, key, value)
    row.data_origin = 'real'

    db.add(row)
    db.commit()
    db.refresh(row)
    return row
