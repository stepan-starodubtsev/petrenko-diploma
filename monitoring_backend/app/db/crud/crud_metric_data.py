from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
from datetime import datetime, timezone

from app.db.models.metric_data import MetricData
from app.schemas.metric_data import MetricDataCreate
from app.db.crud.crud_host import update_host_last_metric_at

def get_metric_data_by_id(db: Session, metric_data_id: uuid.UUID) -> Optional[MetricData]:
    return db.query(MetricData).filter(MetricData.id == metric_data_id).first()

def get_metric_data_for_host(
    db: Session,
    host_id: uuid.UUID,
    metric_key: Optional[str] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    skip: int = 0,
    limit: int = 1000
) -> List[MetricData]:
    query = db.query(MetricData).filter(MetricData.host_id == host_id)
    if metric_key:
        query = query.filter(MetricData.metric_key == metric_key)
    if start_time:
        query = query.filter(MetricData.timestamp >= start_time)
    if end_time:
        query = query.filter(MetricData.timestamp <= end_time)

    return query.order_by(MetricData.timestamp.desc()).offset(skip).limit(limit).all()

def create_metric_data(db: Session, metric_in: MetricDataCreate) -> MetricData:
    timestamp = metric_in.timestamp if metric_in.timestamp else datetime.now(timezone.utc)

    db_metric = MetricData(
        host_id=metric_in.host_id,
        metric_key=metric_in.metric_key,
        value_numeric=metric_in.value_numeric,
        value_text=metric_in.value_text,
        timestamp=timestamp
    )
    db.add(db_metric)
    db.commit()
    db.refresh(db_metric)

    update_host_last_metric_at(db, host_id=metric_in.host_id)

    return db_metric

def create_multiple_metric_data(db: Session, metrics_in: List[MetricDataCreate]) -> List[MetricData]:
    db_metrics = []
    host_ids_to_update = set()

    for metric_in in metrics_in:
        timestamp = metric_in.timestamp if metric_in.timestamp else datetime.now(timezone.utc)
        db_metric = MetricData(
            host_id=metric_in.host_id,
            metric_key=metric_in.metric_key,
            value_numeric=metric_in.value_numeric,
            value_text=metric_in.value_text,
            timestamp=timestamp
        )
        db_metrics.append(db_metric)
        host_ids_to_update.add(metric_in.host_id)

    db.add_all(db_metrics)
    db.commit()

    for db_m in db_metrics:
        db.refresh(db_m)

    for host_id in host_ids_to_update:
        update_host_last_metric_at(db, host_id=host_id)

    return db_metrics

def get_latest_metric(db: Session, host_id: uuid.UUID, metric_key: str) -> Optional[MetricData]: # <--- НОВА ФУНКЦІЯ
    return db.query(MetricData)\
        .filter(MetricData.host_id == host_id, MetricData.metric_key == metric_key)\
        .order_by(MetricData.timestamp.desc())\
        .first()