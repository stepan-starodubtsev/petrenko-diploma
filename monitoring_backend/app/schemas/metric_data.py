from pydantic import BaseModel, ConfigDict
from typing import Optional
import uuid
from datetime import datetime

class MetricDataBase(BaseModel):
    metric_key: str
    value_numeric: Optional[float] = None
    value_text: Optional[str] = None

class MetricDataCreate(MetricDataBase):
    host_id: uuid.UUID
    timestamp: Optional[datetime] = None

class MetricDataRead(MetricDataBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    host_id: uuid.UUID
    timestamp: datetime