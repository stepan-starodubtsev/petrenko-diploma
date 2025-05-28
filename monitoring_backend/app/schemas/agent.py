from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class AgentMetricItem(BaseModel):
    metric_key: str
    value_numeric: Optional[float] = None
    value_text: Optional[str] = None
    timestamp: Optional[datetime] = None

class AgentDataPayload(BaseModel):
    metrics: List[AgentMetricItem]
    agent_type: Optional[str] = None