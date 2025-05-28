# app/services/agent_service.py
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime

from app.db import crud
from app.db.models.enums import HostAvailabilityStatusEnum, HostTypeEnum
from app.schemas.host import HostCreate, HostApproveData
from app.schemas.metric_data import MetricDataCreate
from app.schemas.agent import AgentDataPayload  # AgentMetricItem не використовується напряму тут
# ВИПРАВЛЕННЯ: Імпортуємо правильну схему
from app.schemas.trigger_config import TriggerConfigCreateForHost  # <--- ЗМІНА ТУТ
from app.predefined_data import TRIGGER_TEMPLATES


def process_agent_data(
        db: Session,
        unique_agent_id: str,
        payload: AgentDataPayload,
        client_ip: Optional[str] = None
) -> Dict[str, Any]:
    host = crud.crud_host.get_host_by_agent_id(db, unique_agent_id=unique_agent_id)

    if not host:
        host_type_str = payload.agent_type or "windows_agent"
        try:
            host_type = HostTypeEnum[host_type_str]
        except KeyError:
            host_type = HostTypeEnum.windows_agent

            # Намагаємося отримати IP з першого запиту агента, якщо він є
        # Це потребує, щоб агент надсилав свій IP або щоб ми його визначали з запиту (складніше)
        # Поки що залишимо IP опціональним при створенні
        host_create_schema = HostCreate(
            name=f"agent-{unique_agent_id[:8]}",
            unique_agent_id=unique_agent_id,
            host_type=host_type,
            ip_address=client_ip
        )
        host = crud.crud_host.create_host(db, host_in=host_create_schema)
        return {"status": "registered_pending_approval", "host_id": str(host.id), "name": host.name}

    if host.availability_status == HostAvailabilityStatusEnum.pending_approval:
        return {"status": "host_pending_approval", "host_id": str(host.id),
                "message": "Host is awaiting admin approval."}

    if not host.is_monitored:
        return {"status": "host_not_monitored", "host_id": str(host.id), "message": "Host monitoring is disabled."}

    metrics_to_create: List[MetricDataCreate] = []
    for item in payload.metrics:
        metrics_to_create.append(
            MetricDataCreate(
                host_id=host.id,
                metric_key=item.metric_key,
                value_numeric=item.value_numeric,
                value_text=item.value_text,
                timestamp=item.timestamp or datetime.utcnow()
            )
        )

    if metrics_to_create:
        crud.crud_metric_data.create_multiple_metric_data(db, metrics_in=metrics_to_create)
        if host.availability_status != HostAvailabilityStatusEnum.up:
            crud.crud_host.update_host_availability(db, host_id=host.id, status=HostAvailabilityStatusEnum.up)
        # commit відбувається всередині create_multiple_metric_data та update_host_availability (якщо він робить commit)
        # Або краще один commit тут, якщо CRUD функції його не роблять самі по собі
        db.commit()

    return {"status": "metrics_processed", "host_id": str(host.id), "metrics_received": len(metrics_to_create)}


def approve_pending_agent(
        db: Session,
        unique_agent_id: str,
        approval_data: HostApproveData
) -> crud.crud_host.Host:
    host = crud.crud_host.get_host_by_agent_id(db, unique_agent_id=unique_agent_id)
    if not host:
        raise ValueError(f"Agent with unique_agent_id '{unique_agent_id}' not found")
    if host.availability_status != HostAvailabilityStatusEnum.pending_approval:
        raise ValueError("Host is not pending approval")

    # Оновлюємо хост (approve_host вже робить commit)
    updated_host = crud.crud_host.approve_host(
        db,
        db_host=host,
        name=approval_data.name,
        ip_address=approval_data.ip_address  # Передаємо IP адресу
    )

    # Автоматичне створення predefined тригерів для нового хоста
    for template in TRIGGER_TEMPLATES:
        if updated_host.host_type and updated_host.host_type.value in template["applies_to_host_types"]:
            existing = crud.crud_trigger_config.get_trigger_config_by_host_and_key(
                db, host_id=updated_host.id, internal_trigger_key=template["internal_trigger_key"]
            )
            if not existing:
                # Формування плейсхолдерів. Переконайся, що updated_host має атрибут 'name'.
                # approval_data.name є більш надійним джерелом імені на цьому етапі.
                host_display_name = approval_data.name

                name_override_val = None
                if template.get("name_template"):  # Перевіряємо наявність ключа
                    try:
                        name_override_val = template["name_template"].format(host_name=host_display_name)
                    except KeyError:  # Якщо плейсхолдер інший
                        name_override_val = template["name_template"].replace("{host.name}", host_display_name)

                description_override_val = None
                if template.get("description_template"):  # Перевіряємо наявність ключа
                    try:
                        description_override_val = template["description_template"].format(
                            host_name=host_display_name,
                            threshold_value=template["default_threshold_value"],
                            metric_value='N/A'
                        )
                    except KeyError:
                        description_override_val = template["description_template"].replace("{host.name}",
                                                                                            host_display_name) \
                            .replace("{threshold.value}", str(template["default_threshold_value"])) \
                            .replace("{metric.value}", "N/A")

                # ВИПРАВЛЕННЯ: Використовуємо TriggerConfigCreateForHost
                trigger_create_schema = TriggerConfigCreateForHost(
                    internal_trigger_key=template["internal_trigger_key"],
                    user_threshold_value=str(template["default_threshold_value"]),
                    name_override=name_override_val,
                    description_override=description_override_val,
                    severity_override=template.get("default_severity"),  # Використовуємо .get для безпеки
                    is_enabled=True
                )
                # ВИПРАВЛЕННЯ: Передаємо host_id окремо
                crud.crud_trigger_config.create_trigger_config(
                    db,
                    trigger_config_in=trigger_create_schema,
                    host_id=updated_host.id
                )
    # Один commit після всіх операцій з тригерами та схваленням хоста
    db.commit()
    db.refresh(updated_host)  # Оновлюємо екземпляр хоста з БД
    return updated_host
