from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.inventory import Inventory
from app.models.warehouse import Warehouse
from app.repositories.base import BaseRepository


class InventoryRepository(BaseRepository[Inventory]):
    model = Inventory

    def __init__(self, db: Session):
        super().__init__(db)

    def list_by_org(self, organization_id: str) -> list[Inventory]:
        return list(
            self.db.execute(
                select(Inventory).where(Inventory.organization_id == organization_id)
            ).scalars().all()
        )

    def get_by_warehouse_and_item(
        self, warehouse_id: str, item_id: str, organization_id: str | None = None
    ) -> Inventory | None:
        query = select(Inventory).where(
            Inventory.warehouse_id == warehouse_id,
            Inventory.item_id == item_id,
        )
        if organization_id:
            query = query.where(Inventory.organization_id == organization_id)
        return self.db.execute(query).scalar_one_or_none()

    def upsert(
        self,
        warehouse_id: str,
        item_id: str,
        organization_id: str | None,
        quantity_on_hand: int,
        safety_stock: int,
    ) -> Inventory:
        stmt = select(Inventory).where(
            Inventory.warehouse_id == warehouse_id,
            Inventory.item_id == item_id,
        )
        if organization_id is not None:
            stmt = stmt.where(Inventory.organization_id == organization_id)
        row = self.db.execute(stmt.with_for_update()).scalar_one_or_none()
        if row is None:
            try:
                with self.db.begin_nested():
                    row = Inventory(
                        warehouse_id=warehouse_id,
                        item_id=item_id,
                        organization_id=organization_id,
                        data_origin='real',
                        quantity_on_hand=quantity_on_hand,
                        safety_stock=safety_stock,
                    )
                    self.db.add(row)
                    self.db.flush()
            except IntegrityError:
                # Another request inserted the row after our SELECT. Re-read it
                # under the unique key and apply this request's values.
                row = self.db.execute(stmt.with_for_update()).scalar_one()
                row.organization_id = organization_id or row.organization_id
                row.data_origin = 'real'
                row.quantity_on_hand = quantity_on_hand
                row.safety_stock = safety_stock
                self.db.add(row)
        else:
            row.organization_id = organization_id or row.organization_id
            row.data_origin = 'real'
            row.quantity_on_hand = quantity_on_hand
            row.safety_stock = safety_stock
            self.db.add(row)
        self.db.flush()
        return row

    def get_overview_by_org(self, organization_id: str) -> list[dict]:
        stmt = (
            select(
                Warehouse.code.label('warehouse_code'),
                Warehouse.name.label('warehouse_name'),
                func.coalesce(func.sum(Inventory.quantity_on_hand), 0).label('total_quantity_on_hand'),
                func.coalesce(func.sum(Inventory.safety_stock), 0).label('total_safety_stock'),
                func.max(Warehouse.capacity_units).label('capacity_units'),
            )
            .join(Inventory, Inventory.warehouse_id == Warehouse.id, isouter=True)
            .where(Warehouse.organization_id == organization_id)
            .group_by(Warehouse.code, Warehouse.name)
            .order_by(Warehouse.code)
        )
        rows = self.db.execute(stmt).all()
        return [
            {
                'warehouse_code': row.warehouse_code,
                'warehouse_name': row.warehouse_name,
                'total_quantity_on_hand': row.total_quantity_on_hand,
                'total_safety_stock': row.total_safety_stock,
                'capacity_units': row.capacity_units,
            }
            for row in rows
        ]
