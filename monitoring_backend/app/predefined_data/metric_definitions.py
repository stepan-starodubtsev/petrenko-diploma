# app/predefined_data/metric_definitions.py

# COMMON_AGENT_METRICS залишається таким, як ми визначили раніше:
COMMON_AGENT_METRICS = [
    {
        "key": "system.cpu.utilization",
        "name": "Завантаження CPU",
        "unit": "%",
        "data_type": "numeric"
    },
    {
        "key": "system.memory.used_percent",
        "name": "Використано пам'яті (%)",
        "unit": "%",
        "data_type": "numeric"
    },
    {
        "key": "system.disk.free_gb",
        "name": "Вільно на диску (/)",
        "unit": "GB",
        "data_type": "numeric"
    },
    {
        "key": "system.uptime_seconds",
        "name": "Час роботи системи",
        "unit": "секунд",
        "data_type": "numeric"
    },
]

MIKROTIK_SNMP_METRICS = [
    {
        "key": "mikrotik.system.uptime",
        "name": "Час роботи MikroTik",
        "unit": "seconds",
        "snmp_oid": ".1.3.6.1.2.1.1.3.0",
        "data_type": "numeric_timeticks"
    },
    {
        "key": "mikrotik.system.memory.total",
        "name": "Загальна пам'ять MikroTik",
        "unit": "bytes",
        "snmp_oid": ".1.3.6.1.2.1.25.2.3.1.5.65536",  # Підтверджено
        "data_type": "numeric"
    },
    {
        "key": "mikrotik.system.memory.used",
        "name": "Використано пам'яті MikroTik",
        "unit": "bytes",
        "snmp_oid": ".1.3.6.1.2.1.25.2.3.1.6.65536",  # Підтверджено
        "data_type": "numeric"
    },
    # Віртуальна метрика для відсотка пам'яті (без OID, обчислюється в snmp_service)
    {
        "key": "mikrotik.system.memory.used_percent",
        "name": "Використано пам'яті MikroTik (%)",
        "unit": "%",
        "snmp_oid": None,  # Немає OID, обчислюється
        "data_type": "numeric"
    },
    {
        "key": "mikrotik.system.cpu.load",
        "name": "Завантаження CPU MikroTik",
        "unit": "%",
        "snmp_oid": ".1.3.6.1.2.1.25.3.3.1.2.1",  # hrProcessorLoad, ПЕРЕВІРЕНИЙ OID!
        "data_type": "numeric"
    },
    # --- Метрики для інтерфейсів ---
    # ether1 (ifIndex=1)
    {
        "key": "mikrotik.interface.ether1.in.octets",
        "name": "MikroTik ether1 - Вхідні октети",
        "unit": "bytes",
        "snmp_oid": ".1.3.6.1.2.1.31.1.1.1.6.2",
        "data_type": "numeric_counter"
    },
    {
        "key": "mikrotik.interface.ether1.out.octets",
        "name": "MikroTik ether1 - Вихідні октети",
        "unit": "bytes",
        "snmp_oid": ".1.3.6.1.2.1.31.1.1.1.10.2",
        "data_type": "numeric_counter"
    },
    # НОВА МЕТРИКА: Статус інтерфейсу ether1
    {
        "key": "mikrotik.interface.ether1.oper_status",
        "name": "MikroTik ether1 - Операційний статус",
        "unit": "",  # Це перелічуваний тип (enum)
        "snmp_oid": ".1.3.6.1.2.1.2.2.1.8.2",  # ifOperStatus
        "data_type": "numeric"  # Значення: 1=up, 2=down, 3=testing, etc.
    },
    # ether2 (ifIndex=2)
    {
        "key": "mikrotik.interface.ether2.in.octets",
        "name": "MikroTik ether2 - Вхідні октети (лічильник)",
        "unit": "bytes",
        "snmp_oid": ".1.3.6.1.2.1.31.1.1.1.6.3",  # <--- Індекс .2
        "data_type": "numeric_counter"
    },
    {
        "key": "mikrotik.interface.ether2.out.octets",
        "name": "MikroTik ether2 - Вихідні октети (лічильник)",
        "unit": "bytes",
        "snmp_oid": ".1.3.6.1.2.1.31.1.1.1.10.3",  # <--- Індекс .2
        "data_type": "numeric_counter"
    },
    {
        "key": "mikrotik.interface.ether2.oper_status",
        "name": "MikroTik ether2 - Операційний статус",
        "unit": "",
        "snmp_oid": ".1.3.6.1.2.1.2.2.1.8.3",  # <--- Індекс .2
        "data_type": "numeric"
    },
]

METRIC_DEFINITIONS_BY_HOST_TYPE = {
    "windows_agent": COMMON_AGENT_METRICS,
    "ubuntu_agent": COMMON_AGENT_METRICS,
    "mikrotik_snmp": MIKROTIK_SNMP_METRICS,
}
