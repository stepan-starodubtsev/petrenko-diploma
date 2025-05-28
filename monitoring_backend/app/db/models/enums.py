import enum

class HostTypeEnum(str, enum.Enum):
    mikrotik_snmp = "mikrotik_snmp"
    windows_agent = "windows_agent"
    ubuntu_agent = "ubuntu_agent"

class HostAvailabilityStatusEnum(str, enum.Enum):
    up = "up"
    down = "down"
    unknown = "unknown"
    pending_approval = "pending_approval"

class TriggerStatusEnum(str, enum.Enum):
    ok = "ok"
    problem = "problem"
    unknown = "unknown"

class TriggerSeverityEnum(str, enum.Enum):
    not_classified = "not_classified"
    information = "information"
    warning = "warning"
    average = "average"
    high = "high"
    disaster = "disaster"

class UserRoleEnum(str, enum.Enum):
    admin = "admin"
    user = "user"