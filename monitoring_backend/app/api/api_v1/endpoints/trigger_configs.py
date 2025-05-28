from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid

from app.db import crud
from app.schemas import trigger_config as tc_schema
from app.api.api_v1 import deps

router = APIRouter()

@router.post("/hosts/{host_id}/trigger-configs/", response_model=tc_schema.TriggerConfigRead, status_code=status.HTTP_201_CREATED)
def create_trigger_config_for_host(
    host_id: uuid.UUID,
    trigger_config_in: tc_schema.TriggerConfigCreateForHost,
    db: Session = Depends(deps.get_db)
):
    db_host = crud.crud_host.get_host(db, host_id=host_id)
    if db_host is None:
        raise HTTPException(status_code=404, detail="Host not found to associate trigger with")
    try:
        return crud.crud_trigger_config.create_trigger_config(db=db, trigger_config_in=trigger_config_in, host_id=host_id)
    except ValueError as e:
         raise HTTPException(status_code=400, detail=str(e))


@router.get("/hosts/{host_id}/trigger-configs/", response_model=List[tc_schema.TriggerConfigRead])
def read_trigger_configs_for_host(
    host_id: uuid.UUID,
    skip: int = 0, limit: int = 100,
    db: Session = Depends(deps.get_db)
):

    db_host = crud.crud_host.get_host(db, host_id=host_id)
    if db_host is None:
        raise HTTPException(status_code=404, detail="Host not found")
    return crud.crud_trigger_config.get_trigger_configs_by_host(db, host_id=host_id, skip=skip, limit=limit)

@router.get("/trigger-configs/{trigger_config_id}", response_model=tc_schema.TriggerConfigRead)
def read_trigger_config(trigger_config_id: uuid.UUID, db: Session = Depends(deps.get_db)):

    db_trigger_config = crud.crud_trigger_config.get_trigger_config(db, trigger_config_id=trigger_config_id)
    if db_trigger_config is None:
        raise HTTPException(status_code=404, detail="Trigger configuration not found")
    return db_trigger_config

@router.put("/trigger-configs/{trigger_config_id}", response_model=tc_schema.TriggerConfigRead)
def update_trigger_config(
    trigger_config_id: uuid.UUID,
    trigger_config_in: tc_schema.TriggerConfigUpdate,
    db: Session = Depends(deps.get_db)
):

    db_trigger_config = crud.crud_trigger_config.get_trigger_config(db, trigger_config_id=trigger_config_id)
    if db_trigger_config is None:
        raise HTTPException(status_code=404, detail="Trigger configuration not found")
    return crud.crud_trigger_config.update_trigger_config(db=db, db_trigger_config=db_trigger_config, trigger_config_in=trigger_config_in)

@router.delete("/trigger-configs/{trigger_config_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_trigger_config(trigger_config_id: uuid.UUID, db: Session = Depends(deps.get_db)):

    db_trigger_config = crud.crud_trigger_config.delete_trigger_config(db, trigger_config_id=trigger_config_id)
    if db_trigger_config is None: # crud.delete повертає об'єкт, якщо він був видалений, або None
        raise HTTPException(status_code=404, detail="Trigger configuration not found")
    return # Повертаємо 204 No Content

@router.get("/problems/", response_model=List[tc_schema.TriggerConfigRead], summary="List all active problems")
def list_active_problems(
    skip: int = 0, limit: int = 100,
    db: Session = Depends(deps.get_db)
):

    return crud.crud_trigger_config.get_problem_trigger_configs(db, skip=skip, limit=limit)