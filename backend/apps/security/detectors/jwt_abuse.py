#apps/security/detectors/jwt_abuse.py
from apps.security.services.redis_service import increment_key

from apps.security.services.event_service import (
    create_security_event
)


MAX_JWT_FAILS = 15


def detect_jwt_abuse(*, ip, endpoint):

    key = f"jwt_abuse:{ip}"

    count = increment_key(key)

    if count >= MAX_JWT_FAILS:

        create_security_event(
            ip_address=ip,
            endpoint=endpoint,
            event_type="JWT_ABUSE",
            severity="CRITICAL",
            description="Too many invalid JWT attempts",
            metadata={
                "count": count
            }
        )

        return True

    return False