# config/asgi.py
import os

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter

# Import middleware JWT thay vì AuthMiddlewareStack
from apps.groups.middleware import JwtAuthMiddlewareStack
from apps.security.routing import websocket_urlpatterns as security_ws
from apps.projects.routing import websocket_urlpatterns as project_ws 
from apps.chat.routing import websocket_urlpatterns as chat_ws
from apps.groups.routing import websocket_urlpatterns as group_ws
from apps.tasks.routing import websocket_urlpatterns as task_ws
from apps.notifications.routing import (
    websocket_urlpatterns as notification_ws
)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter({
    "http": django_asgi_app,

    "websocket": JwtAuthMiddlewareStack(
        URLRouter(
            task_ws + chat_ws + project_ws + group_ws + notification_ws + security_ws
        )
    ),
})