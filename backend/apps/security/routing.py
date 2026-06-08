#apps/security/routing.py
from django.urls import path

from .consumers.security_consumer import (
    SecurityConsumer
)

websocket_urlpatterns = [
    path(
        "ws/security/",
        SecurityConsumer.as_asgi()
    )
]