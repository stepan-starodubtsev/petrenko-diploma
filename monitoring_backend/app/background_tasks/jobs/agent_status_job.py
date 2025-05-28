from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from app.db import crud
from app.db.models.enums import HostAvailabilityStatusEnum, HostTypeEnum


AGENT_TIMEOUT_SECONDS = 180

def check_all_agent_availability_job(db_session_factory):
    db: Session = db_session_factory()
    print("Running Agent Status Check Job...")
    try:
        agent_host_types = [HostTypeEnum.windows_agent, HostTypeEnum.ubuntu_agent]

        monitored_up_agents = []
        all_monitored_agents = crud.crud_host.get_hosts(db, is_monitored=True)
        for host in all_monitored_agents:
            if host.host_type in agent_host_types and \
               host.availability_status == HostAvailabilityStatusEnum.up:
                monitored_up_agents.append(host)

        for host in monitored_up_agents:
            if host.last_metric_at:
                if datetime.now(timezone.utc) - host.last_metric_at > timedelta(seconds=AGENT_TIMEOUT_SECONDS):
                    print(f"Agent {host.name} timed out. Setting status to 'down'.")
                    crud.crud_host.update_host_availability(db, host_id=host.id, status=HostAvailabilityStatusEnum.down)
            else:
                print(f"Agent {host.name} has status 'up' but no last_metric_at. Setting to 'unknown'.")
                crud.crud_host.update_host_availability(db, host_id=host.id, status=HostAvailabilityStatusEnum.unknown)

    except Exception as e:
        print(f"Error in Agent Status Check Job: {e}")
    finally:
        db.close()
    print("Agent Status Check Job finished.")