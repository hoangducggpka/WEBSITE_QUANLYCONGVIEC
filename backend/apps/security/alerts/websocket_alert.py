#apps/security/alerts/websocket_alert.py
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync


def send_security_alert(data):

    channel_layer = get_channel_layer()

    async_to_sync(channel_layer.group_send)(
        "security_alerts",
        {
            "type": "security.message",
            "data": data
        }
    )