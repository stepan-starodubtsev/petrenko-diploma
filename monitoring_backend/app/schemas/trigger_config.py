from pydantic import BaseModel, ConfigDict
from typing import Optional
import uuid
from datetime import datetime
from app.db.models.enums import TriggerStatusEnum, TriggerSeverityEnum

class TriggerConfigBase(BaseModel):
    internal_trigger_key: str
    user_threshold_value: str
    is_enabled: Optional[bool] = True
    name_override: Optional[str] = None
    description_override: Optional[str] = None
    severity_override: Optional[TriggerSeverityEnum] = None

class TriggerConfigCreate(TriggerConfigBase):
    host_id: uuid.UUID

class TriggerConfigUpdate(BaseModel):
    user_threshold_value: Optional[str] = None
    is_enabled: Optional[bool] = None
    name_override: Optional[str] = None
    description_override: Optional[str] = None
    severity_override: Optional[TriggerSeverityEnum] = None

class TriggerConfigRead(TriggerConfigBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    host_id: uuid.UUID
    current_status: TriggerStatusEnum
    last_status_change_at: Optional[datetime] = None
    last_evaluated_at: Optional[datetime] = None
    current_metric_value_snapshot: Optional[str] = None
    problem_started_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

class TriggerConfigCreateForHost(TriggerConfigBase):
    pass