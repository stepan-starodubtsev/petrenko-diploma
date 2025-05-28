# app/predefined_data/trigger_templates.py
from app.db.models.enums import TriggerSeverityEnum # Переконайся, що цей імпорт є

# Список словників, де кожен словник - це шаблон тригера
TRIGGER_TEMPLATES = [
    # --- Тригери для Windows/Ubuntu Агентів ---
    {
        "internal_trigger_key": "agent_cpu_high_utilization_critical", # Можна перейменувати на ..._disaster або ..._high
        "name_template": "Високе завантаження CPU на {host.name}",
        "description_template": "Завантаження CPU ({metric.value}%) перевищило критичний поріг {threshold.value}%",
        "metric_key_to_check": "system.cpu.utilization",
        "default_operator": ">",
        "default_threshold_value": "90",
        "value_type": "numeric",
        "default_severity": TriggerSeverityEnum.high, # ВИПРАВЛЕНО (або .disaster, якщо це найвищий рівень)
        "applies_to_host_types": ["windows_agent", "ubuntu_agent"]
    },
    {
        "internal_trigger_key": "agent_cpu_high_utilization_warning",
        "name_template": "Підвищене завантаження CPU на {host.name}",
        "description_template": "Завантаження CPU ({metric.value}%) перевищило попереджувальний поріг {threshold.value}%",
        "metric_key_to_check": "system.cpu.utilization",
        "default_operator": ">",
        "default_threshold_value": "80",
        "value_type": "numeric",
        "default_severity": TriggerSeverityEnum.warning, # Цей був правильний
        "applies_to_host_types": ["windows_agent", "ubuntu_agent"]
    },
    {
        "internal_trigger_key": "agent_low_free_memory_critical", # Можна перейменувати на ..._disaster або ..._high
        "name_template": "Критично мало вільної пам'яті на {host.name}",
        "description_template": "Вільної оперативної пам'яті ({metric.value}MB) менше критичного порогу {threshold.value}MB",
        "metric_key_to_check": "system.memory.free_mb",
        "default_operator": "<",
        "default_threshold_value": "256",
        "value_type": "numeric",
        "default_severity": TriggerSeverityEnum.high, # ВИПРАВЛЕНО (або .disaster)
        "applies_to_host_types": ["windows_agent", "ubuntu_agent"]
    },
    {
        "internal_trigger_key": "agent_low_free_disk_critical", # Можна перейменувати на ..._disaster або ..._high
        "name_template": "Критично мало місця на диску {host.name}",
        "description_template": "Вільного місця на диску ({metric.value}GB) менше критичного порогу {threshold.value}GB",
        "metric_key_to_check": "system.disk.free_gb[/]",
        "default_operator": "<",
        "default_threshold_value": "5",
        "value_type": "numeric",
        "default_severity": TriggerSeverityEnum.high, # ВИПРАВЛЕНО (або .disaster)
        "applies_to_host_types": ["windows_agent", "ubuntu_agent"]
    },

    # --- Тригери для MikroTik SNMP ---
    {
        "internal_trigger_key": "mikrotik_cpu_temp_critical", # Можна перейменувати на ..._disaster або ..._high
        "name_template": "Критична температура CPU на MikroTik {host.name}",
        "description_template": "Температура CPU MikroTik ({metric.value}°C) перевищила критичний поріг {threshold.value}°C",
        "metric_key_to_check": "mikrotik.health.cpu-temperature",
        "default_operator": ">",
        "default_threshold_value": "75",
        "value_type": "numeric",
        "default_severity": TriggerSeverityEnum.high, # ВИПРАВЛЕНО (або .disaster)
        "applies_to_host_types": ["mikrotik_snmp"]
    },
    {
        "internal_trigger_key": "mikrotik_cpu_load_high",
        "name_template": "Високе завантаження CPU на MikroTik {host.name}",
        "description_template": "Завантаження CPU MikroTik ({metric.value}%) перевищило поріг {threshold.value}%",
        "metric_key_to_check": "mikrotik.system.cpu.load",
        "default_operator": ">",
        "default_threshold_value": "85",
        "value_type": "numeric",
        "default_severity": TriggerSeverityEnum.average, # ВИПРАВЛЕНО (або .high, якщо це більш серйозно)
        "applies_to_host_types": ["mikrotik_snmp"]
    },
]

# Можна створити словник для швидкого доступу за ключем, якщо потрібно
TRIGGER_TEMPLATES_BY_KEY = {tpl["internal_trigger_key"]: tpl for tpl in TRIGGER_TEMPLATES}