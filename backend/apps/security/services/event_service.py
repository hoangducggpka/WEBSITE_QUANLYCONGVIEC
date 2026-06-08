from apps.security.models import SecurityEvent


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

    return SecurityEvent.objects.create(
        user=user,
        ip_address=ip_address,
        endpoint=endpoint,
        event_type=event_type,
        severity=severity,
        description=description,
        metadata=metadata or {}
    )