from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
from datetime import datetime

from app.db import crud
from app.schemas import metric_data as metric_schema
from app.api.api_v1 import deps

router = APIRouter()

@router.get("/hosts/{host_id}/metrics/", response_model=List[metric_schema.MetricDataRead])
def read_metric_data_for_host(
    host_id: uuid.UUID,
    metric_key: Optional[str] = Query(None, description="Ключ метрики для фільтрації"),
    start_time: Optional[datetime] = Query(None, description="Початковий час для вибірки (ISO формат)"),
    end_time: Optional[datetime] = Query(None, description="Кінцевий час для вибірки (ISO формат)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(1000, ge=1, le=5000),
    db: Session = Depends(deps.get_db)
):
    db_host = crud.crud_host.get_host(db, host_id=host_id)
    if db_host is None:
        raise HTTPException(status_code=404, detail="Host not found")

    metrics = crud.crud_metric_data.get_metric_data_for_host(
        db,
        host_id=host_id,
        metric_key=metric_key,
        start_time=start_time,
        end_time=end_time,
        skip=skip,
        limit=limit
    )
    return metrics