from sqlalchemy.orm import Session
from typing import Dict, Any
from datetime import datetime, timedelta, timezone

from app.db import crud
from app.db.models.host import Host
from app.db.models.enums import TriggerStatusEnum, HostAvailabilityStatusEnum
from app.predefined_data import TRIGGER_TEMPLATES_BY_KEY

def evaluate_triggers_for_host(db: Session, host: Host) -> Dict[str, Any]:
    if not host.is_monitored or host.availability_status != HostAvailabilityStatusEnum.up:
        trigger_configs = crud.crud_trigger_config.get_trigger_configs_by_host(db, host_id=host.id, is_enabled=True)
        for tc in trigger_configs:
            if tc.current_status != TriggerStatusEnum.unknown:
                crud.crud_trigger_config.update_trigger_status(db, trigger_config_id=tc.id, new_status=TriggerStatusEnum.unknown)
        return {"status": "skipped", "reason": "Host not monitored or not UP"}

    active_trigger_configs = crud.crud_trigger_config.get_trigger_configs_by_host(db, host_id=host.id, is_enabled=True)
    evaluated_count = 0
    problems_found = 0

    for tc in active_trigger_configs:
        template = TRIGGER_TEMPLATES_BY_KEY.get(tc.internal_trigger_key)
        if not template:
            print(f"Warning: No template found for trigger key {tc.internal_trigger_key}")
            crud.crud_trigger_config.update_trigger_status(db, trigger_config_id=tc.id, new_status=TriggerStatusEnum.unknown)
            continue

        
        lookback_time = datetime.now(timezone.utc) - timedelta(minutes=5)
        latest_metrics = crud.crud_metric_data.get_metric_data_for_host(
            db,
            host_id=host.id,
            metric_key=template["metric_key_to_check"],
            start_time=lookback_time,
            limit=1
        )

        if not latest_metrics:
            crud.crud_trigger_config.update_trigger_status(db, trigger_config_id=tc.id, new_status=TriggerStatusEnum.unknown, current_metric_value="N/A (no recent data)")
            continue

        latest_metric = latest_metrics[0]
        current_metric_value_for_log = None

        problem_detected = False
        try:
            metric_value_to_check = None
            if template["value_type"] == "numeric":
                if latest_metric.value_numeric is not None:
                    metric_value_to_check = float(latest_metric.value_numeric)
                    current_metric_value_for_log = str(metric_value_to_check)
                else:
                     crud.crud_trigger_config.update_trigger_status(db, trigger_config_id=tc.id, new_status=TriggerStatusEnum.unknown, current_metric_value="N/A (numeric value missing)")
                     continue
                threshold = float(tc.user_threshold_value)
            else:
                metric_value_to_check = latest_metric.value_text
                current_metric_value_for_log = str(metric_value_to_check)
                threshold = tc.user_threshold_value # Порівнюємо рядки як є

            operator = template["default_operator"]

            if operator == ">": problem_detected = metric_value_to_check > threshold
            elif operator == "<": problem_detected = metric_value_to_check < threshold
            elif operator == ">=": problem_detected = metric_value_to_check >= threshold
            elif operator == "<=": problem_detected = metric_value_to_check <= threshold
            elif operator == "==": problem_detected = metric_value_to_check == threshold
            elif operator == "!=": problem_detected = metric_value_to_check != threshold
            else:
                crud.crud_trigger_config.update_trigger_status(db, trigger_config_id=tc.id, new_status=TriggerStatusEnum.unknown, current_metric_value=current_metric_value_for_log)
                continue

        except (ValueError, TypeError) as e:
            print(f"Error evaluating trigger {tc.id}: {e}")
            crud.crud_trigger_config.update_trigger_status(db, trigger_config_id=tc.id, new_status=TriggerStatusEnum.unknown, current_metric_value="Error")
            continue

        new_status = TriggerStatusEnum.problem if problem_detected else TriggerStatusEnum.ok
        crud.crud_trigger_config.update_trigger_status(db, trigger_config_id=tc.id, new_status=new_status, current_metric_value=current_metric_value_for_log)

        if new_status == TriggerStatusEnum.problem:
            problems_found +=1
        evaluated_count += 1

    return {"status": "triggers_evaluated", "host_id": host.id, "evaluated_count": evaluated_count, "problems_found": problems_found}