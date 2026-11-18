from sqlalchemy.orm import Session

from app.db.session import get_session


def get_db_session() -> Session:
    db = get_session()
    try:
        yield db
    finally:
        db.close()
