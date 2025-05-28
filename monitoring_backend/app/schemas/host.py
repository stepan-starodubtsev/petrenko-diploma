from pydantic import BaseModel, ConfigDict
from typing import Optional, List
import uuid
from datetime import datetime
from app.db.models.enums import HostTypeEnum, HostAvailabilityStatusEnum

class HostBase(BaseModel):
    name: str
    ip_address: Optional[str] = None
    host_type: HostTypeEnum
    unique_agent_id: Optional[str] = None
    snmp_community: Optional[str] = None
    snmp_port: Optional[int] = 161
    snmp_version: Optional[str] = "2c"
    is_monitored: Optional[bool] = True
    notes: Optional[str] = None

class HostCreate(HostBase):
    pass

class HostUpdate(BaseModel):
    name: Optional[str] = None
    ip_address: Optional[str] = None
    host_type: Optional[HostTypeEnum] = None
    unique_agent_id: Optional[str] = None
    snmp_community: Optional[str] = None
    snmp_port: Optional[int] = None
    snmp_version: Optional[str] = None
    is_monitored: Optional[bool] = None
    notes: Optional[str] = None

class HostRead(HostBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    availability_status: HostAvailabilityStatusEnum
    last_metric_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

class HostApproveData(BaseModel):
    name: str
    ip_address: Optional[str] = None