import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.api_v1 import deps
from app.db import crud
from app.schemas import host as host_schema

router = APIRouter()

@router.post("/", response_model=host_schema.HostRead, status_code=status.HTTP_201_CREATED)
def create_host(host: host_schema.HostCreate, db: Session = Depends(deps.get_db)):
    """
    Створити новий хост (зазвичай для SNMP або вручну).
    Агенти реєструються через інший ендпоінт.
    """
    db_host_by_name = crud.crud_host.get_host_by_name(db, name=host.name)
    if db_host_by_name:
        raise HTTPException(status_code=400, detail=f"Host with name '{host.name}' already exists.")
    if host.unique_agent_id:
        db_host_by_agent_id = crud.crud_host.get_host_by_agent_id(db, unique_agent_id=host.unique_agent_id)
        if db_host_by_agent_id:
             raise HTTPException(status_code=400, detail=f"Host with agent ID '{host.unique_agent_id}' already exists.")
    return crud.crud_host.create_host(db=db, host_in=host)

@router.get("/", response_model=List[host_schema.HostRead])
def read_hosts(
    skip: int = 0, limit: int = 100,
    # Тут можна додати фільтри, наприклад, за типом, статусом тощо
    db: Session = Depends(deps.get_db)
):
    hosts = crud.crud_host.get_hosts(db, skip=skip, limit=limit)
    return hosts

@router.get("/{host_id}", response_model=host_schema.HostRead)
def read_host(host_id: uuid.UUID, db: Session = Depends(deps.get_db)):
    db_host = crud.crud_host.get_host(db, host_id=host_id)
    if db_host is None:
        raise HTTPException(status_code=404, detail="Host not found")
    return db_host

@router.put("/{host_id}", response_model=host_schema.HostRead)
def update_host(host_id: uuid.UUID, host: host_schema.HostUpdate, db: Session = Depends(deps.get_db)):
    db_host = crud.crud_host.get_host(db, host_id=host_id)
    if db_host is None:
        raise HTTPException(status_code=404, detail="Host not found")
    # Перевірка на унікальність імені, якщо воно змінюється
    if host.name and host.name != db_host.name:
        existing_host = crud.crud_host.get_host_by_name(db, name=host.name)
        if existing_host and existing_host.id != host_id:
            raise HTTPException(status_code=400, detail=f"Host with name '{host.name}' already exists.")
    return crud.crud_host.update_host(db=db, db_host=db_host, host_in=host)

@router.delete("/{host_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_host(host_id: uuid.UUID, db: Session = Depends(deps.get_db)):
    db_host = crud.crud_host.delete_host(db, host_id=host_id)
    if db_host is None:
        raise HTTPException(status_code=404, detail="Host not found")
    return # Повертаємо 204 No Content