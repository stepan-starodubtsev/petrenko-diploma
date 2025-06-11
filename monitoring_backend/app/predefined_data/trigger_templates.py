# app/predefined_data/trigger_templates.py
from ..db.models.enums import TriggerSeverityEnum

TRIGGER_TEMPLATES = [
    # --- Існуючі тригери для Агентів ---
    {
        "internal_trigger_key": "agent_cpu_high_utilization_high",
        "name_template": "Високе завантаження CPU на {host_name}",
        "description_template": "Завантаження CPU ({metric_value}%) на {host_name} перевищило поріг {threshold_value}%",
        "metric_key_to_check": "system.cpu.utilization",
        "default_operator": ">", "default_threshold_value": "90",
        "value_type": "numeric", "default_severity": TriggerSeverityEnum.high,
        "applies_to_host_types": ["windows_agent", "ubuntu_agent"]
    },
    {
        "internal_trigger_key": "agent_low_free_disk_high",
        "name_template": "Мало місця на диску {host_name}",
        "description_template": "Вільного місця на диску ({metric_value}GB) на {host_name} менше порогу {threshold_value}GB",
        "metric_key_to_check": "system.disk.free_gb",
        "default_operator": "<", "default_threshold_value": "10",
        "value_type": "numeric", "default_severity": TriggerSeverityEnum.high,
        "applies_to_host_types": ["windows_agent", "ubuntu_agent"]
    },
    # --- НОВИЙ ТРИГЕР: Нещодавнє перезавантаження Агента ---
    {
        "internal_trigger_key": "agent_recently_rebooted",
        "name_template": "Пристрій {host_name} було перезавантажено",
        "description_template": "Час роботи системи ({metric_value_formatted}) менше порогу ({threshold_value} секунд)",
        "metric_key_to_check": "system.uptime_seconds",
        "default_operator": "<", "default_threshold_value": "300", # 5 хвилин
        "value_type": "numeric", "default_severity": TriggerSeverityEnum.information, # Інформаційний
        "applies_to_host_types": ["windows_agent", "ubuntu_agent"]
    },

{
        "internal_trigger_key": "agent_high_memory_usage_warning",
        "name_template": "Високе використання пам'яті на {host_name}",
        "description_template": "Використано пам'яті ({metric_value}%) на {host_name} перевищило поріг {threshold_value}%",
        "metric_key_to_check": "system.memory.used_percent", # Використовуємо метрику у відсотках
        "default_operator": ">", "default_threshold_value": "85",
        "value_type": "numeric", "default_severity": TriggerSeverityEnum.warning,
        "applies_to_host_types": ["windows_agent", "ubuntu_agent"]
    },
    # --- НОВИЙ ТРИГЕР: КРИТИЧНО високе використання пам'яті (відсотки) ---
     {
        "internal_trigger_key": "agent_high_memory_usage_high",
        "name_template": "Критично високе використання пам'яті на {host_name}",
        "description_template": "Використано пам'яті ({metric_value}%) на {host_name} перевищило критичний поріг {threshold_value}%",
        "metric_key_to_check": "system.memory.used_percent",
        "default_operator": ">", "default_threshold_value": "95",
        "value_type": "numeric", "default_severity": TriggerSeverityEnum.high,
        "applies_to_host_types": ["windows_agent", "ubuntu_agent"]
    },

    # --- Існуючі тригери для MikroTik ---
    {
        "internal_trigger_key": "mikrotik_cpu_load_high",
        "name_template": "Високе завантаження CPU на MikroTik {host_name}",
        "description_template": "Завантаження CPU MikroTik ({metric_value}%) перевищило поріг {threshold_value}%",
        "metric_key_to_check": "mikrotik.system.cpu.load",
        "default_operator": ">", "default_threshold_value": "85",
        "value_type": "numeric", "default_severity": TriggerSeverityEnum.high,
        "applies_to_host_types": ["mikrotik_snmp"]
    },
    # --- НОВИЙ ТРИГЕР: Високе використання пам'яті на MikroTik (на основі віртуальної метрики) ---
    {
        "internal_trigger_key": "mikrotik_high_memory_usage",
        "name_template": "Високе використання пам'яті на MikroTik {host_name}",
        "description_template": "Використано пам'яті ({metric_value}%) на {host_name} перевищило поріг {threshold_value}%",
        "metric_key_to_check": "mikrotik.system.memory.used_percent", # <--- Використовуємо нову метрику
        "default_operator": ">", "default_threshold_value": "85",
        "value_type": "numeric", "default_severity": TriggerSeverityEnum.average,
        "applies_to_host_types": ["mikrotik_snmp"]
    },
    # --- НОВИЙ ТРИГЕР: Нещодавнє перезавантаження MikroTik ---
    {
        "internal_trigger_key": "mikrotik_recently_rebooted",
        "name_template": "MikroTik {host_name} було перезавантажено",
        "description_template": "Час роботи MikroTik ({metric_value_formatted}) менше порогу ({threshold_value} секунд)",
        "metric_key_to_check": "mikrotik.system.uptime",
        "default_operator": "<", "default_threshold_value": "300", # 5 хвилин
        "value_type": "numeric", "default_severity": TriggerSeverityEnum.information,
        "applies_to_host_types": ["mikrotik_snmp"]
    },
    # --- НОВИЙ ТРИГЕР: Інтерфейс ether1 "впав" ---
    {
        "internal_trigger_key": "mikrotik_interface_ether1_down",
        "name_template": "Інтерфейс ether1 на {host_name} неактивний (down)",
        "description_template": "Операційний статус інтерфейсу ether1 ({metric_value}) не дорівнює 1 (up).",
        "metric_key_to_check": "mikrotik.interface.ether1.oper_status",
        "default_operator": "!=", "default_threshold_value": "1", # 1 означає 'up'
        "value_type": "numeric", "default_severity": TriggerSeverityEnum.warning,
        "applies_to_host_types": ["mikrotik_snmp"]
    },
    # --- НОВИЙ ТРИГЕР: Інтерфейс ether2 "впав" ---
    {
        "internal_trigger_key": "mikrotik_interface_ether2_down",
        "name_template": "Інтерфейс ether2 на {host_name} неактивний (down)",
        "description_template": "Операційний статус інтерфейсу ether2 ({metric_value}) не дорівнює 1 (up).",
        "metric_key_to_check": "mikrotik.interface.ether2.oper_status",
        "default_operator": "!=", "default_threshold_value": "1",
        "value_type": "numeric", "default_severity": TriggerSeverityEnum.high,
        "applies_to_host_types": ["mikrotik_snmp"]
    }
]

# Словник для швидкого доступу за ключем, як і раніше
TRIGGER_TEMPLATES_BY_KEY = {tpl["internal_trigger_key"]: tpl for tpl in TRIGGER_TEMPLATES}