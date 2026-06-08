#apps/security/alerts/auto_response.py
from apps.security.services.redis_service import set_cooldown


def apply_ip_cooldown(ip):

    set_cooldown(ip, 600)