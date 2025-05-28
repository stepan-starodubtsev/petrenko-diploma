# app/predefined_data/metric_definitions.py

COMMON_AGENT_METRICS = [
    {
        "key": "system.cpu.utilization",
        "name": "Завантаження CPU", # <--- Українізація
        "unit": "%",
        "data_type": "numeric"
    },
    {
        "key": "system.memory.total_mb",
        "name": "Загальна пам'ять", # <--- Українізація
        "unit": "MB",
        "data_type": "numeric"
    },
    {
        "key": "system.memory.available_mb",
        "name": "Доступно пам'яті", # <--- Українізація
        "unit": "MB",
        "data_type": "numeric"
    },
    {
        "key": "system.memory.used_percent",
        "name": "Використано пам'яті (%)", # <--- Українізація
        "unit": "%",
        "data_type": "numeric"
    },
    {
        "key": "system.disk.free_gb[/]",
        "name": "Вільно на диску (/)", # <--- Українізація
        "unit": "GB",
        "data_type": "numeric"
    },
    {
        "key": "system.disk.total_gb[/]",
        "name": "Загальний обсяг диску (/)", # <--- Українізація
        "unit": "GB",
        "data_type": "numeric"
    },
    {
        "key": "system.disk.used_percent[/]",
        "name": "Використано місця на диску (%) (/)", # <--- Українізація
        "unit": "%",
        "data_type": "numeric"
    },
    {
        "key": "system.uptime_seconds",
        "name": "Час роботи системи", # <--- Українізація
        "unit": "секунд", # Одиниця для сирих даних
        "data_type": "numeric" # Фронтенд буде форматувати
    },
]

MIKROTIK_SNMP_METRICS = [
    {
        "key": "mikrotik.system.uptime",
        "name": "Час роботи MikroTik", # <--- Українізація
        "unit": "секунд",
        "snmp_oid": ".1.3.6.1.2.1.1.3.0",
        "data_type": "numeric_timeticks" # Сервіс ділить на 100
    },
    {
        "key": "mikrotik.system.memory.total",
        "name": "Загальна пам'ять MikroTik", # <--- Українізація
        "unit": "bytes",
        "snmp_oid": ".1.3.6.1.2.1.25.2.3.1.5.65536",
        "data_type": "numeric"
    },
    {
        "key": "mikrotik.system.memory.used",
        "name": "Використано пам'яті MikroTik", # <--- Українізація
        "unit": "bytes",
        "snmp_oid": ".1.3.6.1.2.1.25.2.3.1.6.65536",
        "data_type": "numeric"
    },
    {
        "key": "mikrotik.system.cpu.frequency",
        "name": "Частота CPU MikroTik", # <--- Українізація
        "unit": "MHz",
        "snmp_oid": ".1.3.6.1.4.1.14988.1.1.3.14.0",
        "data_type": "numeric"
    },
    {
        "key": "mikrotik.system.cpu.load",
        "name": "Завантаження CPU MikroTik (Ядро 1)", # <--- Українізація
        "unit": "%",
        "snmp_oid": ".1.3.6.1.2.1.25.3.3.1.2.1", # ПЕРЕВІРЕНИЙ OID для першого ядра!
        "data_type": "numeric"
    },
    # Приклад для ether1 (ifIndex=1)
    {
        "key": "mikrotik.interface.ether1.in.octets",
        "name": "MikroTik ether1 - Вхідні октети (лічильник)", # <--- Українізація
        "unit": "bytes",
        "snmp_oid": ".1.3.6.1.2.1.31.1.1.1.6.1",
        "data_type": "numeric_counter"
    },
    {
        "key": "mikrotik.interface.ether1.out.octets",
        "name": "MikroTik ether1 - Вихідні октети (лічильник)", # <--- Українізація
        "unit": "bytes",
        "snmp_oid": ".1.3.6.1.2.1.31.1.1.1.10.1",
        "data_type": "numeric_counter"
    },
    # Приклад для ether2 (ifIndex=2)
    {
        "key": "mikrotik.interface.ether2.in.octets",
        "name": "MikroTik ether2 - Вхідні октети (лічильник)", # <--- Українізація
        "unit": "bytes",
        "snmp_oid": ".1.3.6.1.2.1.31.1.1.1.6.2",
        "data_type": "numeric_counter"
    },
    {
        "key": "mikrotik.interface.ether2.out.octets",
        "name": "MikroTik ether2 - Вихідні октети (лічильник)", # <--- Українізація
        "unit": "bytes",
        "snmp_oid": ".1.3.6.1.2.1.31.1.1.1.10.2",
        "data_type": "numeric_counter"
    }
    # !!! ПАМ'ЯТАЙ: Тобі все ще потрібно знайти та додати OID'и для Disk Space та CPU Temperature,
    # якщо твій MikroTik їх підтримує, та українізувати їхні назви.
]

METRIC_DEFINITIONS_BY_HOST_TYPE = {
    "windows_agent": COMMON_AGENT_METRICS,
    "ubuntu_agent": COMMON_AGENT_METRICS, # Якщо метрики однакові
    "mikrotik_snmp": MIKROTIK_SNMP_METRICS,
}