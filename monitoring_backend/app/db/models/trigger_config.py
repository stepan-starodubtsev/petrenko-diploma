from sqlalchemy import Column, String, Boolean, DateTime, func, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from sqlalchemy import Enum as SAEnum

from app.db.base_class import Base
from app.db.models.enums import TriggerStatusEnum, TriggerSeverityEnum

class TriggerConfig(Base):
    __tablename__ = "trigger_configs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    host_id = Column(UUID(as_uuid=True), ForeignKey("hosts.id"), nullable=False, index=True)
    internal_trigger_key = Column(String(255), nullable=False)

    name_override = Column(String(255), nullable=True)
    description_override = Column(Text, nullable=True)

    user_threshold_value = Column(String(255), nullable=False)

    current_status = Column(SAEnum(TriggerStatusEnum, name="trigger_status_enum_type", create_type=True),
                            nullable=False, default=TriggerStatusEnum.unknown)
    severity_override = Column(SAEnum(TriggerSeverityEnum, name="trigger_severity_enum_type", create_type=True),
                               nullable=True)
    is_enabled = Column(Boolean, nullable=False, default=True)

    last_status_change_at = Column(DateTime(timezone=True), nullable=True)
    last_evaluated_at = Column(DateTime(timezone=True), nullable=True)
    current_metric_value_snapshot = Column(String(255), nullable=True)
    problem_started_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    host = relationship("Host", back_populates="trigger_configs")