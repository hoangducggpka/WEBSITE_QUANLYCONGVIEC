# apps/chat/urls.py
from django.urls import path
from .views import (
    ConversationListView,
    GroupConversationView,
    MessageListView,
    SendFileView,
    PinMessageView,
    UnpinMessageView,
    RecallMessageView,
    MessageReactionView,
)

urlpatterns = [
    # Conversations
    path("conversations/",         ConversationListView.as_view()),
    path("conversations/group/",   GroupConversationView.as_view()),

    # Messages
    path("conversations/<uuid:conversation_uuid>/messages/",   MessageListView.as_view()),
    path("conversations/<uuid:conversation_uuid>/send-file/",  SendFileView.as_view()),

    # Message actions
    path("messages/<int:message_id>/pin/",    PinMessageView.as_view()),
    path("messages/<int:message_id>/unpin/",  UnpinMessageView.as_view()),
    path("messages/<int:message_id>/recall/", RecallMessageView.as_view()),
    path("messages/<int:message_id>/react/",  MessageReactionView.as_view()),
]
# # apps/chat/urls.py
# from django.urls import path
# from .views import ConversationListView, GroupConversationView, MessageListView

# urlpatterns = [
#     path("conversations/", ConversationListView.as_view()),
#     path("conversations/group/", GroupConversationView.as_view()),
#     path("conversations/<uuid:conversation_uuid>/messages/", MessageListView.as_view()),
# ]