from django.urls import re_path

from .consumers.message_consumer import MessageConsumer
from .consumers.global_consumer import GlobalChatConsumer

websocket_urlpatterns = [


    re_path(
        r"ws/chat/global/$",
        GlobalChatConsumer.as_asgi()
    ),

    re_path(
        r"ws/chat/(?P<conversation_id>[\w-]+)/$",
        MessageConsumer.as_asgi()
    ),


]
