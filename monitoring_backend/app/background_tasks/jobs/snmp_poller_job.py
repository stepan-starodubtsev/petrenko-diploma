# app/background_tasks/jobs/snmp_poller_job.py
import asyncio
from sqlalchemy.orm import Session
from app.db import crud
from app.services import snmp_service  # snmp_service.poll_snmp_host є async
from app.db.models.enums import HostTypeEnum, HostAvailabilityStatusEnum
from app.db.models.host import Host


# poll_single_host_async_modified вже є async def, це добре.
# Прибираємо параметр snmp_engine_instance, якщо snmp_service.poll_snmp_host
# сам керує своїм SnmpEngine (створює та закриває).
async def poll_single_host_async_wrapper(db: Session, host: Host):
    print(f"Polling SNMP host: {host.name} ({host.ip_address})")
    try:
        await snmp_service.poll_snmp_host(db, host=host)
    except Exception as e:
        print(f"Error polling SNMP host {host.name}: {e}")
        try:
            db.rollback()
            crud.crud_host.update_host_availability(db, host_id=host.id, status=HostAvailabilityStatusEnum.down)
            db.commit()
        except Exception as e_crud:
            print(f"Error updating host availability for {host.name} after SNMP error: {e_crud}")
            db.rollback()


# Робимо головну функцію завдання асинхронною
async def poll_all_snmp_hosts_job(db_session_factory):
    db_for_host_list: Session = db_session_factory()
    print("Running SNMP Polling Job (async)...")

    active_snmp_hosts_to_poll = []
    try:
        snmp_hosts = crud.crud_host.get_hosts(
            db_for_host_list,
            host_type=HostTypeEnum.mikrotik_snmp,
            is_monitored=True
        )
        # Зберігаємо тільки ID хостів, щоб уникнути проблем з об'єктами між сесіями
        active_snmp_host_ids = [
            host.id for host in snmp_hosts
            if host.availability_status != HostAvailabilityStatusEnum.pending_approval
        ]
    except Exception as e:
        print(f"Error fetching SNMP host IDs: {e}")
        active_snmp_host_ids = []  # Порожній список, якщо не вдалося отримати
    finally:
        db_for_host_list.close()

    if not active_snmp_host_ids:
        print("SNMP Polling Job: No active SNMP hosts to poll.")
        print("SNMP Polling Job finished.")
        return

    # Створюємо ОДНУ сесію для всіх асинхронних операцій в цьому запуску завдання
    db_for_async_ops: Session = db_session_factory()
    try:
        tasks = []
        for host_id in active_snmp_host_ids:
            host_obj = crud.crud_host.get_host(db_for_async_ops, host_id=host_id)  # Перезавантажуємо хост з новою сесією
            if host_obj:
                tasks.append(poll_single_host_async_wrapper(db_for_async_ops, host_obj))
            else:
                print(f"SNMP Polling Job: Host with ID {host_id} not found in current session.")

        if tasks:
            await asyncio.gather(*tasks)  # Виконуємо всі завдання паралельно

    except Exception as e:
        print(f"Error during main SNMP polling logic: {e}")
        db_for_async_ops.rollback()
    finally:
        db_for_async_ops.close()

    print("SNMP Polling Job finished.")