"""Org-scoped CSV upsert helpers (blueprint decision #13).

Per-handler row mapping extracted from ``api/endpoints/ingestion.py`` so
the endpoint module stays under the 400-line cap. Lookups are scoped by
``organization_id``; every insert/update is stamped
``organization_id`` + ``data_origin='real'``. When ``org_id`` is None
(org-less legacy write contract) the lookup falls back to the global
namespace and no org stamp is applied — pre-existing behavior preserved.

Import map: models (5 tables), pandas only. Never imports app.api.
"""

from __future__ import annotations

import math

import pandas as pd
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.fleet_asset import FleetAsset
from app.models.inventory import Inventory
from app.models.item import Item
from app.models.order import HistoricalOrder
from app.models.warehouse import Warehouse


def _org_filter(column, org_id):
    return column == org_id if org_id is not None else None


def _finite_float(value, *, field: str, minimum: float | None = None, maximum: float | None = None) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        raise ValueError(f'{field} must be numeric') from None
    if not math.isfinite(parsed):
        raise ValueError(f'{field} must be finite')
    if minimum is not None and parsed < minimum:
        raise ValueError(f'{field} must be at least {minimum}')
    if maximum is not None and parsed > maximum:
        raise ValueError(f'{field} must be at most {maximum}')
    return parsed


def _non_negative_int(value, *, field: str) -> int:
    try:
        parsed = float(value)
    except (TypeError, ValueError, OverflowError):
        raise ValueError(f'{field} must be an integer') from None
    if not math.isfinite(parsed) or not parsed.is_integer():
        raise ValueError(f'{field} must be an integer')
    if parsed < 0:
        raise ValueError(f'{field} must be non-negative')
    return int(parsed)


def _positive_int(value, *, field: str) -> int:
    parsed = _non_negative_int(value, field=field)
    if parsed <= 0:
        raise ValueError(f'{field} must be positive')
    return parsed


def _required_text(value, *, field: str, maximum: int | None = None) -> str:
    if pd.isna(value):
        raise ValueError(f'{field} is required')
    text = str(value).strip()
    if not text or text.casefold() in {'nan', 'nat', 'none'}:
        raise ValueError(f'{field} is required')
    if maximum is not None and len(text) > maximum:
        raise ValueError(f'{field} must be at most {maximum} characters')
    return text


def upsert_warehouses(db: Session, org_id, df: pd.DataFrame) -> dict:
    processed = created = updated = 0
    errors: list[str] = []
    seen: dict[str, Warehouse] = {}
    for idx, row in df.iterrows():
        processed += 1
        try:
            code = _required_text(row['code'], field='code', maximum=32)
            existing = seen.get(code)
            if existing is None:
                query = select(Warehouse).where(Warehouse.code == code)
                if org_id is not None:
                    query = query.where(Warehouse.organization_id == org_id)
                existing = db.execute(query).scalar_one_or_none()
            payload = {
                'name': _required_text(row['name'], field='name', maximum=128),
                'address': _required_text(row['address'], field='address', maximum=255),
                'city': _required_text(row['city'], field='city', maximum=64),
                'state': _required_text(row['state'], field='state', maximum=64),
                'country': _required_text(row['country'], field='country', maximum=64),
                'latitude': _finite_float(row['latitude'], field='latitude', minimum=-90, maximum=90),
                'longitude': _finite_float(row['longitude'], field='longitude', minimum=-180, maximum=180),
                'capacity_units': _non_negative_int(row['capacity_units'], field='capacity_units'),
            }
            if existing:
                for key, value in payload.items():
                    setattr(existing, key, value)
                existing.data_origin = 'real'
                existing.organization_id = org_id
                db.add(existing)
                updated += 1
            else:
                existing = Warehouse(code=code, organization_id=org_id, data_origin='real', **payload)
                db.add(existing)
                created += 1
            seen[code] = existing
        except Exception as exc:
            errors.append(f'row {idx + 2}: {exc}')
    return {
        'records_processed': processed,
        'records_created': created,
        'records_updated': updated,
        'errors': errors,
    }


def upsert_items(db: Session, org_id, df: pd.DataFrame) -> dict:
    processed = created = updated = 0
    errors: list[str] = []
    seen: dict[str, Item] = {}
    for idx, row in df.iterrows():
        processed += 1
        try:
            sku = _required_text(row['sku'], field='sku', maximum=64)
            existing = seen.get(sku)
            if existing is None:
                query = select(Item).where(Item.sku == sku)
                if org_id is not None:
                    query = query.where(Item.organization_id == org_id)
                existing = db.execute(query).scalar_one_or_none()
            payload = {
                'name': _required_text(row['name'], field='name', maximum=128),
                'category': _required_text(row['category'], field='category', maximum=64),
                'unit_cost': _finite_float(row['unit_cost'], field='unit_cost', minimum=0),
                'reorder_level': _non_negative_int(row['reorder_level'], field='reorder_level'),
            }
            if 'temperature_threshold' in df.columns and pd.notna(row['temperature_threshold']):
                payload['temperature_threshold'] = _finite_float(
                    row['temperature_threshold'], field='temperature_threshold'
                )
            if existing:
                for key, value in payload.items():
                    setattr(existing, key, value)
                existing.data_origin = 'real'
                existing.organization_id = org_id
                db.add(existing)
                updated += 1
            else:
                existing = Item(sku=sku, organization_id=org_id, data_origin='real', **payload)
                db.add(existing)
                created += 1
            seen[sku] = existing
        except Exception as exc:
            errors.append(f'row {idx + 2}: {exc}')
    return {
        'records_processed': processed,
        'records_created': created,
        'records_updated': updated,
        'errors': errors,
    }


def upsert_fleet(db: Session, org_id, df: pd.DataFrame) -> dict:
    processed = created = updated = 0
    errors: list[str] = []
    seen: dict[str, FleetAsset] = {}
    for idx, row in df.iterrows():
        processed += 1
        try:
            vehicle_code = _required_text(row['vehicle_code'], field='vehicle_code', maximum=64)
            existing = seen.get(vehicle_code)
            if existing is None:
                query = select(FleetAsset).where(FleetAsset.vehicle_code == vehicle_code)
                if org_id is not None:
                    query = query.where(FleetAsset.organization_id == org_id)
                existing = db.execute(query).scalar_one_or_none()
            payload = {
                'driver_name': _required_text(row['driver_name'], field='driver_name', maximum=128),
                'driver_contact': (
                    _required_text(row['driver_contact'], field='driver_contact', maximum=128)
                    if 'driver_contact' in df.columns and pd.notna(row['driver_contact'])
                    else None
                ),
                'capacity_units': _non_negative_int(row['capacity_units'], field='capacity_units'),
                'status': (
                    _required_text(row['status'], field='status', maximum=24)
                    if 'status' in df.columns and pd.notna(row['status'])
                    else 'active'
                ),
            }
            if existing:
                for key, value in payload.items():
                    setattr(existing, key, value)
                existing.data_origin = 'real'
                existing.organization_id = org_id
                db.add(existing)
                updated += 1
            else:
                existing = FleetAsset(
                    vehicle_code=vehicle_code,
                    organization_id=org_id,
                    data_origin='real',
                    **payload,
                )
                db.add(existing)
                created += 1
            seen[vehicle_code] = existing
        except Exception as exc:
            errors.append(f'row {idx + 2}: {exc}')
    return {
        'records_processed': processed,
        'records_created': created,
        'records_updated': updated,
        'errors': errors,
    }


def _lookup_warehouse(db: Session, org_id, code: str) -> Warehouse | None:
    query = select(Warehouse).where(Warehouse.code == code)
    if org_id is not None:
        query = query.where(Warehouse.organization_id == org_id)
    return db.execute(query).scalar_one_or_none()


def _lookup_item(db: Session, org_id, sku: str) -> Item | None:
    query = select(Item).where(Item.sku == sku)
    if org_id is not None:
        query = query.where(Item.organization_id == org_id)
    return db.execute(query).scalar_one_or_none()


def upsert_inventory(db: Session, org_id, df: pd.DataFrame) -> dict:
    processed = created = updated = 0
    errors: list[str] = []
    seen: dict[tuple[object, object], Inventory] = {}
    for idx, row in df.iterrows():
        processed += 1
        try:
            warehouse_code = _required_text(row['warehouse_code'], field='warehouse_code', maximum=32)
            sku = _required_text(row['sku'], field='sku', maximum=64)
            warehouse = _lookup_warehouse(db, org_id, warehouse_code)
            item = _lookup_item(db, org_id, sku)
            if not warehouse or not item:
                raise ValueError('warehouse_code or sku not found')

            key = (warehouse.id, item.id)
            existing = seen.get(key)
            if existing is None:
                existing = db.execute(
                    select(Inventory).where(
                        Inventory.warehouse_id == warehouse.id, Inventory.item_id == item.id
                    )
                ).scalar_one_or_none()

            safety_stock = (
                _non_negative_int(row['safety_stock'], field='safety_stock')
                if 'safety_stock' in df.columns and pd.notna(row['safety_stock'])
                else 0
            )
            quantity_on_hand = _non_negative_int(row['quantity_on_hand'], field='quantity_on_hand')

            if existing:
                existing.quantity_on_hand = quantity_on_hand
                existing.safety_stock = safety_stock
                existing.data_origin = 'real'
                existing.organization_id = org_id
                db.add(existing)
                updated += 1
            else:
                existing = Inventory(
                    warehouse_id=warehouse.id,
                    item_id=item.id,
                    organization_id=org_id,
                    data_origin='real',
                    quantity_on_hand=quantity_on_hand,
                    safety_stock=safety_stock,
                )
                db.add(existing)
                created += 1
            seen[key] = existing
        except Exception as exc:
            errors.append(f'row {idx + 2}: {exc}')
    return {
        'records_processed': processed,
        'records_created': created,
        'records_updated': updated,
        'errors': errors,
    }


def upsert_orders(db: Session, org_id, df: pd.DataFrame) -> dict:
    processed = created = updated = 0
    errors: list[str] = []
    for idx, row in df.iterrows():
        processed += 1
        try:
            warehouse_code = _required_text(row['warehouse_code'], field='warehouse_code', maximum=32)
            sku = _required_text(row['sku'], field='sku', maximum=64)
            warehouse = _lookup_warehouse(db, org_id, warehouse_code)
            item = _lookup_item(db, org_id, sku)
            if not warehouse or not item:
                raise ValueError('warehouse_code or sku not found')

            raw_order_date = row['order_date']
            if pd.isna(raw_order_date) or not str(raw_order_date).strip():
                raise ValueError('order_date is required')
            try:
                parsed_order_date = pd.to_datetime(raw_order_date)
            except (TypeError, ValueError, OverflowError):
                raise ValueError('order_date must be a valid date') from None
            if pd.isna(parsed_order_date):
                raise ValueError('order_date must be a valid date')
            order_date = parsed_order_date.date()
            customer_region = (
                _required_text(row['customer_region'], field='customer_region', maximum=64)
                if 'customer_region' in df.columns and pd.notna(row['customer_region'])
                else 'unknown'
            )
            payload = {
                'quantity': _positive_int(row['quantity'], field='quantity'),
                'unit_price': (
                    _finite_float(row['unit_price'], field='unit_price', minimum=0)
                    if 'unit_price' in df.columns and pd.notna(row['unit_price'])
                    else 0.0
                ),
                'weather_avg_temp_c': (
                    _finite_float(row['weather_avg_temp_c'], field='weather_avg_temp_c')
                    if 'weather_avg_temp_c' in df.columns and pd.notna(row['weather_avg_temp_c'])
                    else None
                ),
                'weather_precip_mm': (
                    _finite_float(row['weather_precip_mm'], field='weather_precip_mm', minimum=0)
                    if 'weather_precip_mm' in df.columns and pd.notna(row['weather_precip_mm'])
                    else None
                ),
                'weather_disruption_index': (
                    _finite_float(
                        row['weather_disruption_index'],
                        field='weather_disruption_index',
                        minimum=0,
                        maximum=1,
                    )
                    if 'weather_disruption_index' in df.columns
                    and pd.notna(row['weather_disruption_index'])
                    else None
                ),
            }
            db.add(
                HistoricalOrder(
                    order_date=order_date,
                    warehouse_id=warehouse.id,
                    item_id=item.id,
                    organization_id=org_id,
                    data_origin='real',
                    customer_region=customer_region,
                    **payload,
                )
            )
            created += 1
        except Exception as exc:
            errors.append(f'row {idx + 2}: {exc}')
    return {
        'records_processed': processed,
        'records_created': created,
        'records_updated': updated,
        'errors': errors,
    }
