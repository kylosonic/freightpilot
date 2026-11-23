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
from app.models.item import Item
from app.models.membership import OrganizationMembership
from app.models.user import User
from app.schemas.auth import UserRole
from app.schemas.item import ItemCreate, ItemRead, ItemUpdate

router = APIRouter()


@router.get('', response_model=list[ItemRead])
def list_items(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    membership: OrganizationMembership = Depends(get_current_membership),
    _: User = Depends(require_roles(UserRole.VIEWER, UserRole.OPERATOR, UserRole.ADMIN)),
):
    query = select(Item).where(Item.organization_id == membership.organization_id)
    rows = (
        db.execute(query.order_by(Item.sku, Item.id).offset(skip).limit(limit))
        .scalars()
        .all()
    )
    return rows


@router.post('', response_model=ItemRead, status_code=201)
def create_item(
    payload: ItemCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.OPERATOR, UserRole.ADMIN)),
    writable: OrganizationMembership = Depends(require_writable_workspace),
):

    exists_query = select(Item).where(
        Item.sku == payload.sku,
        Item.organization_id == writable.organization_id,
    )
    exists = db.execute(exists_query).scalar_one_or_none()
    if exists:
        raise HTTPException(status_code=409, detail='SKU already exists')

    item = Item(
        **payload.model_dump(),
        organization_id=writable.organization_id,
    )
    db.add(item)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail='SKU already exists') from None
    db.refresh(item)
    return item


@router.get('/{item_id}', response_model=ItemRead)
def get_item(
    item_id: str,
    db: Session = Depends(get_db),
    membership: OrganizationMembership = Depends(get_current_membership),
    _: User = Depends(require_roles(UserRole.VIEWER, UserRole.OPERATOR, UserRole.ADMIN)),
):
    item_uuid = validate_uuid(item_id, detail='Item not found')
    row = db.execute(
        select(Item).where(
            Item.id == item_uuid,
            Item.organization_id == membership.organization_id,
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail='Item not found')
    return row


@router.patch('/{item_id}', response_model=ItemRead)
def update_item(
    item_id: str,
    payload: ItemUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.OPERATOR, UserRole.ADMIN)),
    writable: OrganizationMembership = Depends(require_writable_workspace),
):

    item_uuid = validate_uuid(item_id, detail='Item not found')
    row = db.execute(
        select(Item).where(
            Item.id == item_uuid,
            Item.organization_id == writable.organization_id,
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail='Item not found')

    for key, value in payload.model_dump(exclude_none=True).items():
        setattr(row, key, value)
    row.data_origin = 'real'

    db.add(row)
    db.commit()
    db.refresh(row)
    return row
