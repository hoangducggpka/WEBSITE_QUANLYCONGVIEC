#apps/tasks/routing.py
from django.urls import re_path

from .consumers import TaskActivityConsumer


websocket_urlpatterns = [
    re_path(
        r"ws/tasks/activity/$",
        TaskActivityConsumer.as_asgi(),
    ),
]