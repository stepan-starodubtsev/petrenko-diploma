# app/services/snmp_service.py
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import asyncio

# Імпорти згідно з наданою документацією (v3arch.asyncio)
from pysnmp.hlapi.v3arch.asyncio import (
    SnmpEngine,
    CommunityData,
    UdpTransportTarget,
    ContextData,
    ObjectType,
    ObjectIdentity,
    get_cmd  # <--- Зверни увагу на нижній регістр
)
from pysnmp.error import PySnmpError  # Для обробки специфічних помилок pysnmp

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

    # Створюємо SnmpEngine. Згідно документації, його можна створити один раз.
    snmp_engine = SnmpEngine()

    try:
        mp_model = 0
        if host.snmp_version and host.snmp_version.lower() == '2c':
            mp_model = 1

        community_data = CommunityData(host.snmp_community or "public", mpModel=mp_model)

        try:
            transport_target = await UdpTransportTarget.create(
                (str(host.ip_address), host.snmp_port or 161)
            )
            # Значення timeout та retries за замовчуванням для UdpTransportTarget: timeout=1, retries=5
            # Якщо потрібно змінити:
            # transport_target.timeout = 2.0
            # transport_target.retries = 1
        except PySnmpError as e:
            print(f"SNMP error creating transport target for host {host.name}: {e}")
            if host.availability_status != HostAvailabilityStatusEnum.down:
                crud.crud_host.update_host_availability(db, host_id=host.id, status=HostAvailabilityStatusEnum.down)
                db.commit()
            # Немає чого закривати в snmp_engine, якщо transport target не створено
            return {"status": "error", "host_id": host.id, "message": f"Failed to create SNMP transport target: {e}"}

        context_data = ContextData()

        for metric_def in snmp_definitions:
            oid_str = metric_def.get("snmp_oid")
            if not oid_str:
                continue

            current_timestamp = datetime.now(timezone.utc)
            object_type = ObjectType(ObjectIdentity(oid_str))

            try:
                errorIndication, errorStatus, errorIndex, varBinds = await get_cmd(  # <--- Використовуємо get_cmd
                    snmp_engine,
                    community_data,
                    transport_target,
                    context_data,
                    object_type
                )  # Приклад показує виклик get_cmd
            except PySnmpError as e:
                print(f"SNMP PySnmpError during get_cmd for host {host.name} OID {oid_str}: {e}")
                snmp_errors += 1
                continue
            except Exception as e_generic_getcmd:
                print(f"Generic error during get_cmd for host {host.name} OID {oid_str}: {e_generic_getcmd}")
                snmp_errors += 1
                continue

            if errorIndication:
                print(f"SNMP error indication for host {host.name} OID {oid_str}: {errorIndication}")
                snmp_errors += 1
                continue
            elif errorStatus:  # True if errorStatus is non-zero
                print(f"SNMP error status for host {host.name} OID {oid_str}: {errorStatus.prettyPrint()}")
                if errorIndex and varBinds and int(errorIndex) <= len(varBinds) and varBinds[
                    int(errorIndex) - 1]:  # Додав перевірку varBinds[int(errorIndex)-1]
                    print(f"Error at MIB object: {varBinds[int(errorIndex) - 1][0]}")
                snmp_errors += 1
                continue
            else:
                for varBindRow in varBinds:  # varBinds - це список (OID, value)
                    raw_value_obj = varBindRow[1]  # Отримуємо значення (ObjectSyntax)

                    value_numeric: Optional[float] = None
                    value_text: Optional[str] = None
                    metric_key = metric_def["key"]
                    data_type = metric_def.get("data_type", "numeric")

                    try:
                        current_raw_value = float(raw_value_obj.prettyPrint())

                        if metric_def.get("divisor"):
                            current_raw_value /= metric_def["divisor"]

                        if data_type == "numeric_timeticks":
                            value_numeric = current_raw_value / 100.0
                        elif data_type == "numeric_counter":
                            value_numeric = current_raw_value
                        else:
                            value_numeric = current_raw_value
                    except (ValueError, TypeError, AttributeError) as e:
                        if data_type not in ["numeric_timeticks", "numeric_counter", "numeric"]:
                            value_text = str(raw_value_obj.prettyPrint())

                    if value_numeric is not None or value_text is not None:
                        metrics_to_create.append(
                            MetricDataCreate(
                                host_id=host.id,
                                metric_key=metric_key,
                                value_numeric=value_numeric,
                                value_text=value_text,
                                timestamp=current_timestamp
                            )
                        )

        # Обробка результатів після циклу
        if metrics_to_create:
            crud.crud_metric_data.create_multiple_metric_data(db, metrics_in=metrics_to_create)
            if host.availability_status != HostAvailabilityStatusEnum.up:
                crud.crud_host.update_host_availability(db, host_id=host.id, status=HostAvailabilityStatusEnum.up)
            db.commit()
        elif snmp_errors == 0 and len(snmp_definitions) > 0:
            if host.availability_status != HostAvailabilityStatusEnum.up:
                crud.crud_host.update_host_availability(db, host_id=host.id, status=HostAvailabilityStatusEnum.up)
                db.commit()
        elif snmp_errors > 0 and not metrics_to_create and len(snmp_definitions) > 0:
            if host.availability_status != HostAvailabilityStatusEnum.down:
                crud.crud_host.update_host_availability(db, host_id=host.id, status=HostAvailabilityStatusEnum.down)
                db.commit()

        return {"status": "snmp_polled", "host_id": host.id, "metrics_collected": len(metrics_to_create),
                "snmp_errors": snmp_errors}

    except PySnmpError as e_main:
        print(f"CRITICAL PySnmpError during SNMP polling for host {host.name}: {e_main}")
        if host.availability_status != HostAvailabilityStatusEnum.down:
            try:
                crud.crud_host.update_host_availability(db, host_id=host.id, status=HostAvailabilityStatusEnum.down)
                db.commit()
            except Exception as e_db_critical:
                print(f"Failed to update host status after critical PySnmpError for {host.name}: {e_db_critical}")
        return {"status": "critical_pysnmp_error", "host_id": host.id, "message": str(e_main)}
    except Exception as e_general:
        print(f"CRITICAL GENERAL ERROR during SNMP polling for host {host.name}: {e_general}")
        if host.availability_status != HostAvailabilityStatusEnum.down:
            try:
                crud.crud_host.update_host_availability(db, host_id=host.id, status=HostAvailabilityStatusEnum.down)
                db.commit()
            except Exception as e_db_critical:
                print(f"Failed to update host status after critical general error for {host.name}: {e_db_critical}")
        return {"status": "critical_general_error", "host_id": host.id, "message": str(e_general)}
    finally:
        # Згідно документації, SnmpEngine має метод close_dispatcher(), але це може бути
        # псевдонім для transportDispatcher.closeDispatcher().
        # Перевіряємо наявність transportDispatcher, як і раніше.
        if snmp_engine and hasattr(snmp_engine, 'transportDispatcher') and snmp_engine.transportDispatcher:
            try:
                snmp_engine.transportDispatcher.closeDispatcher()
                # print(f"SNMP transport dispatcher closed for host {host.name}")
            except Exception as e_close:
                print(f"Error closing SNMP transport dispatcher for host {host.name}: {e_close}")