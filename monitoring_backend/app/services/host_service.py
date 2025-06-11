# app/services/host_service.py
from sqlalchemy.orm import Session

from app.db import crud
from app.db.models.host import Host
from app.schemas.host import HostCreate
from app.predefined_data import TRIGGER_TEMPLATES
from app.schemas.trigger_config import TriggerConfigCreateForHost  # Імпортуємо схему


def create_host_with_triggers(db: Session, host_in: HostCreate) -> Host:
    """
    Створює новий хост і автоматично додає до нього
    відповідні predefined тригери.
    """
    # 1. Створюємо сам хост
    db_host = crud.host.create_host(db=db, host_in=host_in)

    # 2. Проходимо по шаблонах тригерів і додаємо відповідні
    for template in TRIGGER_TEMPLATES:
        # Перевіряємо, чи застосовний цей шаблон до типу створеного хоста
        if db_host.host_type.value in template.get("applies_to_host_types", []):
            # Формуємо назву та опис
            host_display_name = db_host.name
            name_override_val = template.get("name_template", "").replace("{host_name}", host_display_name)
            description_override_val = template.get("description_template", "") \
                .replace("{host_name}", host_display_name) \
                .replace("{threshold_value}", str(template["default_threshold_value"])) \
                .replace("{metric_value}", "N/A")

            # Створюємо схему для нового TriggerConfig
            trigger_create_schema = TriggerConfigCreateForHost(
                internal_trigger_key=template["internal_trigger_key"],
                user_threshold_value=str(template["default_threshold_value"]),
                name_override=name_override_val,
                description_override=description_override_val,
                severity_override=template.get("default_severity"),
                is_enabled=True
            )

            # Викликаємо CRUD функцію для створення запису в БД
            crud.trigger_config.create_trigger_config(
                db,
                trigger_config_in=trigger_create_schema,
                host_id=db_host.id
            )

    # Commit робиться в crud.trigger_config.create_trigger_config, але краще один спільний
    # Якщо твої CRUD функції не роблять commit, його потрібно зробити тут:
    db.commit()
    db.refresh(db_host)

    return db_host