#apps/security/services
from apps.security.models import SecurityEvent
from apps.security.alerts.dispatcher import dispatch_security_alert

def create_security_event(
    *,
    user=None,
    ip_address,
    endpoint,
    event_type,
    severity,
    description,
    metadata=None
):

    event = SecurityEvent.objects.create(
        user=user,
        ip_address=ip_address,
        endpoint=endpoint,
        event_type=event_type,
        severity=severity,
        description=description,
        metadata=metadata or {}
    )

    # 👉 TRIGGER ALERT HERE
    dispatch_security_alert(event)

    return event