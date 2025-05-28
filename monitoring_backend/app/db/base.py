from app.db.base_class import Base # Імпортуємо декларативну базу
from app.db.models.enums import * # Імпортуємо всі enums (якщо вони в окремому файлі)
from app.db.models.user import User
from app.db.models.host import Host
from app.db.models.metric_data import MetricData
from app.db.models.trigger_config import TriggerConfig