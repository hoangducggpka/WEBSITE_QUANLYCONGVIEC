#apps/notifications/notification_service.py
from .models import Notification
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


def create_notification_and_broadcast(user, content, group_name,priority=1, extra=None):
    notification = Notification.objects.create(
        user=user,
        content=content,
        priority=priority
    )

    channel_layer = get_channel_layer()

    async_to_sync(channel_layer.group_send)(
        group_name,
        {
            "type": "notification_message", 
            "payload": {
                "id": notification.id,
                "content": notification.content,
                "priority": notification.priority,
                "created_at": notification.created_at.isoformat(),
                "extra": extra or {}
            }
        }
    )