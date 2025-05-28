from sqlalchemy import Column, String, DateTime, Float, func, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.db.base_class import Base

class MetricData(Base):
    __tablename__ = "metric_data"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    host_id = Column(UUID(as_uuid=True), ForeignKey("hosts.id"), nullable=False, index=True)
    metric_key = Column(String(255), nullable=False, index=True)
    value_numeric = Column(Float, nullable=True)
    value_text = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), index=True)

    host = relationship("Host", back_populates="metrics")