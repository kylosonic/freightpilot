from __future__ import annotations

from fastapi import APIRouter

from app.api.endpoints.dispatch import driver, orders, runs

router = APIRouter()
router.include_router(orders.router)
router.include_router(runs.router)
router.include_router(driver.router)
