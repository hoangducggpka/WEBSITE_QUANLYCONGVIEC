#apps/security/detectors/brute_force.py
from apps.security.services.redis_service import (
    increment_key,
    set_cooldown
)

from apps.security.services.event_service import (
    create_security_event
)


MAX_FAILS = 10


def detect_bruteforce(*, ip, endpoint, user=None):

    key = f"login_fail:{ip}"

    attempts = increment_key(key)

    if attempts >= MAX_FAILS:

        set_cooldown(ip)

        create_security_event(
            user=user,
            ip_address=ip,
            endpoint=endpoint,
            event_type="LOGIN_BRUTEFORCE",
            severity="HIGH",
            description="Too many failed login attempts",
            metadata={
                "attempts": attempts
            }
        )

        return True

    return False