from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
from datetime import datetime, timezone

from app.db.models.trigger_config import TriggerConfig
from app.db.models.enums import TriggerStatusEnum
from app.schemas.trigger_config import TriggerConfigCreate, TriggerConfigUpdate, TriggerConfigCreateForHost


def get_trigger_config(db: Session, trigger_config_id: uuid.UUID) -> Optional[TriggerConfig]:
    return db.query(TriggerConfig).filter(TriggerConfig.id == trigger_config_id).first()

def get_trigger_configs_by_host(
    db: Session, host_id: uuid.UUID,
    is_enabled: Optional[bool] = None,
    skip: int = 0, limit: int = 100
) -> List[TriggerConfig]:
    query = db.query(TriggerConfig).filter(TriggerConfig.host_id == host_id)
    if is_enabled is not None:
        query = query.filter(TriggerConfig.is_enabled == is_enabled)
    return query.offset(skip).limit(limit).all()

def get_trigger_config_by_host_and_key(
    db: Session, host_id: uuid.UUID, internal_trigger_key: str
) -> Optional[TriggerConfig]:
    return db.query(TriggerConfig).filter(
        TriggerConfig.host_id == host_id,
        TriggerConfig.internal_trigger_key == internal_trigger_key
    ).first()

def create_trigger_config(db: Session, trigger_config_in: TriggerConfigCreateForHost, host_id: uuid.UUID) -> TriggerConfig: # <--- Змінено сигнатуру
    existing_trigger = get_trigger_config_by_host_and_key(
        db,
        host_id=host_id,
        internal_trigger_key=trigger_config_in.internal_trigger_key
    )
    if existing_trigger:
        raise ValueError(f"Trigger with key '{trigger_config_in.internal_trigger_key}' already exists for host ID {host_id}.")

    db_trigger_config = TriggerConfig(
        host_id=host_id,
        internal_trigger_key=trigger_config_in.internal_trigger_key,
        user_threshold_value=trigger_config_in.user_threshold_value,
        name_override=trigger_config_in.name_override,
        description_override=trigger_config_in.description_override,
        is_enabled=trigger_config_in.is_enabled if trigger_config_in.is_enabled is not None else True,
        severity_override=trigger_config_in.severity_override,
    )
    db.add(db_trigger_config)
    db.commit()
    db.refresh(db_trigger_config)
    return db_trigger_config


def update_trigger_config(
    db: Session, db_trigger_config: TriggerConfig, trigger_config_in: TriggerConfigUpdate
) -> TriggerConfig:
    update_data = trigger_config_in.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(db_trigger_config, field, value)

    db.add(db_trigger_config)
    db.commit()
    db.refresh(db_trigger_config)
    return db_trigger_config

def update_trigger_status(
    db: Session,
    trigger_config_id: uuid.UUID,
    new_status: TriggerStatusEnum,
    current_metric_value: Optional[str] = None
) -> Optional[TriggerConfig]:
    db_trigger_config = get_trigger_config(db, trigger_config_id=trigger_config_id)
    if db_trigger_config:
        if db_trigger_config.current_status != new_status:
            db_trigger_config.current_status = new_status
            db_trigger_config.last_status_change_at = datetime.now(timezone.utc)
            if new_status == TriggerStatusEnum.problem:
                db_trigger_config.problem_started_at = datetime.now(timezone.utc)
                db_trigger_config.current_metric_value_snapshot = current_metric_value
            elif db_trigger_config.current_status == TriggerStatusEnum.problem and new_status == TriggerStatusEnum.ok:
                db_trigger_config.current_metric_value_snapshot = current_metric_value

        db_trigger_config.last_evaluated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(db_trigger_config)
    return db_trigger_config

def delete_trigger_config(db: Session, trigger_config_id: uuid.UUID) -> Optional[TriggerConfig]:
    db_trigger_config = get_trigger_config(db, trigger_config_id=trigger_config_id)
    if db_trigger_config:
        db.delete(db_trigger_config)
        db.commit()
    return db_trigger_config


def get_problem_trigger_configs(db: Session, skip: int = 0, limit: int = 100) -> List[TriggerConfig]:
    return db.query(TriggerConfig).filter(
        TriggerConfig.current_status == TriggerStatusEnum.problem,
        TriggerConfig.is_enabled == True
    ).order_by(TriggerConfig.last_status_change_at.desc()).offset(skip).limit(limit).all()