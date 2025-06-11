# app/services/snmp_service.py
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import asyncio

# Імпорти для нової версії pysnmp (v3arch.asyncio)
from pysnmp.hlapi.v3arch.asyncio import (
    SnmpEngine,
    CommunityData,
    UdpTransportTarget,
    ContextData,
    ObjectType,
    ObjectIdentity,
    get_cmd
)
from pysnmp.error import PySnmpError

from app.db import crud
from app.db.models.host import Host
from app.db.models.enums import HostAvailabilityStatusEnum, HostTypeEnum
from app.schemas.metric_data import MetricDataCreate
from app.predefined_data import METRIC_DEFINITIONS_BY_HOST_TYPE


async def poll_snmp_host(db: Session, host: Host) -> Dict[str, Any]:
    if not host.is_monitored or host.availability_status == HostAvailabilityStatusEnum.pending_approval:
        return {"status": "skipped", "reason": "Host not monitored or pending approval"}

    if host.host_type != HostTypeEnum.mikrotik_snmp:
        return {"status": "skipped", "reason": "Host is not an SNMP type"}

    snmp_definitions = METRIC_DEFINITIONS_BY_HOST_TYPE.get(host.host_type.value, [])
    if not snmp_definitions:
        return {"status": "skipped", "reason": "No SNMP metric definitions for this host type"}

    metrics_to_create: List[MetricDataCreate] = []
    snmp_errors = 0
    snmp_engine = SnmpEngine()

    try:
        mp_model = 1 if host.snmp_version and host.snmp_version.lower() == '2c' else 0

        community_data = CommunityData(host.snmp_community or "public", mpModel=mp_model)

        try:
            transport_target = await UdpTransportTarget.create(
                (str(host.ip_address), host.snmp_port or 161)
            )
            # За потреби можна налаштувати таймаути після створення:
            # transport_target.timeout = 2.0
            # transport_target.retries = 1
        except PySnmpError as e:
            print(f"SNMP error creating transport target for host {host.name}: {e}")
            if host.availability_status != HostAvailabilityStatusEnum.down:
                crud.host.update_host_availability(db, host_id=host.id, status=HostAvailabilityStatusEnum.down)
                db.commit()
            return {"status": "error", "host_id": str(host.id),
                    "message": f"Failed to create SNMP transport target: {e}"}

        context_data = ContextData()

        # Зберігаємо результати тут для подальших обчислень
        polled_values: Dict[str, Any] = {}

        for metric_def in snmp_definitions:
            oid_str = metric_def.get("snmp_oid")
            if not oid_str:
                continue

            object_type = ObjectType(ObjectIdentity(oid_str))

            try:
                errorIndication, errorStatus, errorIndex, varBinds = await get_cmd(
                    snmp_engine, community_data, transport_target, context_data, object_type
                )
            except PySnmpError as e:
                print(f"SNMP PySnmpError during get_cmd for host {host.name} OID {oid_str}: {e}")
                snmp_errors += 1
                continue

            if errorIndication or errorStatus:
                error_msg = errorIndication or errorStatus.prettyPrint()
                print(f"SNMP data error for host {host.name} OID {oid_str}: {error_msg}")
                snmp_errors += 1
                continue

            for varBindRow in varBinds:
                raw_value_obj = varBindRow[1]
                metric_key = metric_def["key"]

                try:
                    current_raw_value = float(raw_value_obj.prettyPrint())
                    if metric_def.get("divisor"):
                        current_raw_value /= metric_def["divisor"]
                    polled_values[metric_key] = current_raw_value
                except (ValueError, TypeError, AttributeError):
                    polled_values[metric_key] = str(raw_value_obj.prettyPrint())

        # Обробляємо зібрані значення та створюємо метрики для запису в БД
        current_timestamp = datetime.now(timezone.utc)
        for metric_key, raw_value in polled_values.items():
            metric_def = next((m for m in snmp_definitions if m["key"] == metric_key), None)
            if not metric_def: continue

            value_numeric: Optional[float] = None
            value_text: Optional[str] = None
            data_type = metric_def.get("data_type", "numeric")

            if isinstance(raw_value, (int, float)):
                if data_type == "numeric_timeticks":
                    value_numeric = raw_value / 100.0
                else:
                    value_numeric = raw_value
            else:
                value_text = str(raw_value)

            if value_numeric is not None or value_text is not None:
                metrics_to_create.append(
                    MetricDataCreate(
                        host_id=host.id, metric_key=metric_key,
                        value_numeric=value_numeric, value_text=value_text,
                        timestamp=current_timestamp
                    )
                )

        # --- Обчислення та додавання віртуальних метрик ---
        if host.host_type == HostTypeEnum.mikrotik_snmp:
            total_mem = polled_values.get("mikrotik.system.memory.total")
            used_mem = polled_values.get("mikrotik.system.memory.used")
            if isinstance(total_mem, (int, float)) and isinstance(used_mem, (int, float)) and total_mem > 0:
                used_percent = (used_mem / total_mem) * 100
                metrics_to_create.append(
                    MetricDataCreate(
                        host_id=host.id,
                        metric_key="mikrotik.system.memory.used_percent",
                        value_numeric=used_percent,
                        value_text=None,
                        timestamp=current_timestamp
                    )
                )

        # Оновлення статусу хоста та збереження метрик
        if metrics_to_create:
            crud.metric_data.create_multiple_metric_data(db, metrics_in=metrics_to_create)
            if host.availability_status != HostAvailabilityStatusEnum.up:
                crud.host.update_host_availability(db, host_id=host.id, status=HostAvailabilityStatusEnum.up)
            db.commit()
        elif snmp_errors == 0 and len([d for d in snmp_definitions if d.get("snmp_oid")]) > 0:
            if host.availability_status != HostAvailabilityStatusEnum.up:
                crud.host.update_host_availability(db, host_id=host.id, status=HostAvailabilityStatusEnum.up)
                db.commit()
        elif snmp_errors > 0 and not metrics_to_create:
            if host.availability_status != HostAvailabilityStatusEnum.down:
                crud.host.update_host_availability(db, host_id=host.id, status=HostAvailabilityStatusEnum.down)
                db.commit()

        return {"status": "snmp_polled", "host_id": str(host.id), "metrics_collected": len(metrics_to_create),
                "snmp_errors": snmp_errors}

    except PySnmpError as e_main:
        print(f"CRITICAL PySnmpError during SNMP polling for host {host.name}: {e_main}")
        if host.availability_status != HostAvailabilityStatusEnum.down:
            try:
                crud.host.update_host_availability(db, host_id=host.id, status=HostAvailabilityStatusEnum.down)
                db.commit()
            except Exception as e_db_critical:
                print(f"Failed to update host status after critical PySnmpError for {host.name}: {e_db_critical}")
        return {"status": "critical_pysnmp_error", "host_id": str(host.id), "message": str(e_main)}
    except Exception as e_general:
        print(f"CRITICAL GENERAL ERROR during SNMP polling for host {host.name}: {e_general}")
        if host.availability_status != HostAvailabilityStatusEnum.down:
            try:
                crud.host.update_host_availability(db, host_id=host.id, status=HostAvailabilityStatusEnum.down)
                db.commit()
            except Exception as e_db_critical:
                print(f"Failed to update host status after critical general error for {host.name}: {e_db_critical}")
        return {"status": "critical_general_error", "host_id": str(host.id), "message": str(e_general)}
    finally:
        if snmp_engine and hasattr(snmp_engine, 'transportDispatcher') and snmp_engine.transportDispatcher:
            try:
                snmp_engine.transportDispatcher.closeDispatcher()
            except Exception as e_close:
                print(f"Error closing SNMP transport dispatcher for host {host.name}: {e_close}")