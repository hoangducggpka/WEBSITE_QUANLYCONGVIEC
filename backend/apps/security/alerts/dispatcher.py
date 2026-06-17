# apps/security/alerts/dispatcher.py

from apps.security.alerts.telegram import send_telegram_alert
from apps.security.alerts.websocket_alert import send_security_alert

from django.utils import timezone

def format_local_time(dt):
    local_dt = timezone.localtime(dt)
    return local_dt.strftime("%d/%m/%Y %H:%M:%S")


def build_vi_message(event):
    if event.event_type == "LOGIN_BRUTEFORCE":
        return f"""
🚨 CẢNH BÁO TẤN CÔNG BRUTE FORCE

⚠️ Phát hiện quá nhiều lần đăng nhập thất bại

IP: {event.ip_address}
Endpoint: {event.endpoint}

Số lần thử: {event.metadata.get("attempts", "N/A")}

Thời gian: {format_local_time(event.created_at)}"""

    if event.event_type == "JWT_ABUSE":
        return f"""
⚠️ CẢNH BÁO LẠM DỤNG JWT

Phát hiện hành vi gửi quá nhiều request với token không hợp lệ

IP: {event.ip_address}
Endpoint: {event.endpoint}

Số lần vi phạm: {event.metadata.get("count", "N/A")}

Thời gian: {format_local_time(event.created_at)}"""

    return f"""
🔔 CẢNH BÁO HỆ THỐNG

Loại: {event.event_type}
Mức độ: {event.severity}
IP: {event.ip_address}
Endpoint: {event.endpoint}

Thời gian: {format_local_time(event.created_at)}"""


def dispatch_security_alert(event):
    data = {
        "type": event.event_type,
        "severity": event.severity,
        "ip": event.ip_address,
        "endpoint": event.endpoint,
        "description": event.description,
        "metadata": event.metadata,
        "time": str(event.created_at),
    }

    # realtime dashboard (giữ raw data)
    send_security_alert(data)

    # telegram (VI message)
    if event.severity in ["HIGH", "CRITICAL"]:
        message = build_vi_message(event)
        send_telegram_alert(message)