# app/background_tasks/scheduler.py
from apscheduler.schedulers.asyncio import AsyncIOScheduler  # <--- ЗМІНА ТУТ
from apscheduler.triggers.interval import IntervalTrigger
from app.db.database import SessionLocal
# ... (інші імпорти залишаються)
from .jobs.snmp_poller_job import poll_all_snmp_hosts_job  # Ця функція стане async
from .jobs.trigger_evaluator_job import evaluate_all_triggers_job
from .jobs.agent_status_job import check_all_agent_availability_job

scheduler = AsyncIOScheduler(timezone="UTC")  # <--- ЗМІНА ТУТ


def start_scheduler():
    """
    Додає завдання до планувальника та запускає його.
    AsyncIOScheduler запускається в існуючому asyncio event loop.
    """
    # Завдання для SNMP опитування - poll_all_snmp_hosts_job тепер буде async
    scheduler.add_job(
        poll_all_snmp_hosts_job,  # Ця функція тепер має бути async def
        trigger=IntervalTrigger(seconds=5),
        id="snmp_poll_job",
        name="SNMP Polling Job",
        replace_existing=True,
        kwargs={"db_session_factory": SessionLocal}
    )

    # Завдання для оцінки тригерів - може залишатися синхронним,
    # AsyncIOScheduler запустить його в thread pool executor
    scheduler.add_job(
        evaluate_all_triggers_job,
        trigger=IntervalTrigger(seconds=5),
        id="trigger_eval_job",
        name="Trigger Evaluation Job",
        replace_existing=True,
        kwargs={"db_session_factory": SessionLocal}
    )

    # Завдання для перевірки доступності агентів - також може залишатися синхронним
    scheduler.add_job(
        check_all_agent_availability_job,
        trigger=IntervalTrigger(seconds=5),
        id="agent_status_job",
        name="Agent Status Check Job",
        replace_existing=True,
        kwargs={"db_session_factory": SessionLocal}
    )

    try:
        if not scheduler.running:  # Перевіряємо, чи планувальник ще не запущений
            scheduler.start()
            print("AsyncIOScheduler started successfully.")
        else:
            print("AsyncIOScheduler is already running.")
    except Exception as e:
        print(f"Error starting AsyncIOScheduler: {e}")


def shutdown_scheduler():
    """
    Зупиняє планувальник при завершенні роботи додатку.
    """
    if scheduler.running:
        scheduler.shutdown()  # Для AsyncIOScheduler можна також викликати scheduler.shutdown(wait=False)
        print("AsyncIOScheduler shut down successfully.")