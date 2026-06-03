# apps/projects/routing.py
from django.urls import re_path
from .consumers.project_consumer import ProjectConsumer

websocket_urlpatterns = [
    re_path(
        r"ws/projects/(?P<project_uuid>[\w-]+)/$",
        ProjectConsumer.as_asgi(),
    ),
]