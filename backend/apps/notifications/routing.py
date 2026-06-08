#apps/notifications/routing.py
from django.urls import path

from .consumers.notification_consumer import NotificationConsumer

websocket_urlpatterns = [
    path(
        "ws/notifications/",
        NotificationConsumer.as_asgi()
    ),
]