from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.migration_status import migration_readiness
from app.db.session import get_db

router = APIRouter()


@router.get('/schema')
def schema_revision(db: Session = Depends(get_db)) -> dict:
    """Expose only revision state, never connection details or credentials."""
    return migration_readiness(db.connection())
