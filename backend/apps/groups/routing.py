#apps/groups/routing
from django.urls import re_path

# from .consumers.group_consumer import (
#     GroupConsumer
# )

# websocket_urlpatterns = [

#     re_path(
#         r"ws/groups/(?P<group_uuid>[\w-]+)/$",
#         GroupConsumer.as_asgi()
#     )

# ]
from django.urls import re_path

from .consumers.group_consumer import GroupConsumer
from .consumers.presence_consumer import PresenceConsumer

websocket_urlpatterns = [

    re_path(
        r"ws/presence/$",
        PresenceConsumer.as_asgi(),
    ),

    re_path(
        r"ws/groups/(?P<group_uuid>[\w-]+)/$",
        GroupConsumer.as_asgi(),
    ),
]