from sqlalchemy.orm import Session
from app.db import crud
from app.services import trigger_evaluation_service
from app.db.models.enums import HostAvailabilityStatusEnum

def evaluate_all_triggers_job(db_session_factory):
    db: Session = db_session_factory()
    print("Running Trigger Evaluation Job...")
    try:
        active_hosts = crud.crud_host.get_hosts(
            db,
            is_monitored=True,
            availability_status=HostAvailabilityStatusEnum.up
        )
        for host in active_hosts:
            print(f"Evaluating triggers for host: {host.name}")
            try:
                trigger_evaluation_service.evaluate_triggers_for_host(db, host=host)
            except Exception as e:
                print(f"Error evaluating triggers for host {host.name}: {e}")
    except Exception as e:
        print(f"Error in Trigger Evaluation Job: {e}")
    finally:
        db.close()
    print("Trigger Evaluation Job finished.")