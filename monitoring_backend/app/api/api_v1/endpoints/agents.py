from typing import List, Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.api.api_v1 import deps
from app.db import crud
from app.schemas import agent as agent_schema
from app.schemas import host as host_schema
from app.services import agent_service

router = APIRouter()


@router.post("/data/{unique_agent_id}", summary="Submit data from an agent")
def submit_agent_data(
        unique_agent_id: str,
        payload: agent_schema.AgentDataPayload,
        request: Request,
        db: Session = Depends(deps.get_db)
) -> Dict[str, Any]:
    """
    Ендпоінт для агентів для надсилання даних метрик.
    Якщо агент новий, він буде зареєстрований зі статусом 'pending_approval'.
    """
    # Тут можна додати перевірку API ключа агента в майбутньому
    client_ip = request.client.host if request.client else None
    result = agent_service.process_agent_data(
        db=db,
        unique_agent_id=unique_agent_id,
        payload=payload,
        client_ip=client_ip
    )
    if "error" in result.get("status", ""):
        raise HTTPException(status_code=400, detail=result.get("message"))
    return result


@router.get("/pending/", response_model=List[host_schema.HostRead], summary="List agents pending approval")
def list_pending_agents(skip: int = 0, limit: int = 100, db: Session = Depends(deps.get_db)):
    """
    Отримати список хостів-агентів, які очікують на схвалення адміністратором.
    ПОПЕРЕДЖЕННЯ: Цей ендпоінт має бути захищений (тільки для адмінів) в майбутньому.
    """
    hosts = crud.crud_host.get_pending_approval_hosts(db, skip=skip, limit=limit)
    return hosts


@router.post("/pending/{unique_agent_id}/approve", response_model=host_schema.HostRead,
             summary="Approve a pending agent")
def approve_agent(
        unique_agent_id: str,
        approval_data: host_schema.HostApproveData,
        db: Session = Depends(deps.get_db)
):
    """
    Схвалити агента, що очікує.
    ПОПЕРЕДЖЕННЯ: Цей ендпоінт має бути захищений (тільки для адмінів) в майбутньому.
    """
    try:
        host = agent_service.approve_pending_agent(
            db=db,
            unique_agent_id=unique_agent_id,
            approval_data=approval_data
        )
        return host
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:  # Загальний обробник, краще уточнити типи помилок
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
