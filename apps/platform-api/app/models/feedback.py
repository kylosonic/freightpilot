from datetime import datetime

from sqlalchemy import Column, DateTime, String, Text, func
from app.db.base import Base
from app.models.common import UUIDTimestampMixin

class Feedback(UUIDTimestampMixin, Base):
    __tablename__ = 'feedback'
    
    category = Column(String(100), index=True, nullable=False)
    message = Column(Text, nullable=False)
    user_email = Column(String(255), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
