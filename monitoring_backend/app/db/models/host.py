from sqlalchemy import Column, String, Boolean, DateTime, Integer, func, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from sqlalchemy import Enum as SAEnum

from app.db.base_class import Base
from app.db.models.enums import HostTypeEnum, HostAvailabilityStatusEnum

class Host(Base):
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), unique=True, index=True, nullable=False)
    ip_address = Column(String(45), index=True, nullable=True) # nullable=True, може бути невідомий для pending_approval
    host_type = Column(SAEnum(HostTypeEnum, name="host_type_enum_type", create_type=True), nullable=False)

    unique_agent_id = Column(String(255), unique=True, nullable=True, index=True)

    snmp_community = Column(String(255), nullable=True)
    snmp_port = Column(Integer, nullable=True, default=161)
    snmp_version = Column(String(10), nullable=True, default="2c")

    availability_status = Column(SAEnum(HostAvailabilityStatusEnum, name="host_availability_status_enum_type", create_type=True), nullable=False, default=HostAvailabilityStatusEnum.unknown)
    last_metric_at = Column(DateTime(timezone=True), nullable=True)
    is_monitored = Column(Boolean, nullable=False, default=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    metrics = relationship("MetricData", back_populates="host", cascade="all, delete-orphan")
    trigger_configs = relationship("TriggerConfig", back_populates="host", cascade="all, delete-orphan")