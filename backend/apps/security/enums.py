#apps/security/enums.py
class EventTypes:
    LOGIN_BRUTEFORCE = "LOGIN_BRUTEFORCE"
    JWT_ABUSE = "JWT_ABUSE"
    FORCE_LOGOUT = "FORCE_LOGOUT"


class SeverityLevels:
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"