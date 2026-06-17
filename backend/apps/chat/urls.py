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
    MarkConversationReadView,
    UnreadCountView, 
)

urlpatterns = [
    # Conversations
    path("conversations/",         ConversationListView.as_view()),
    path("conversations/group/",   GroupConversationView.as_view()),
    path(
        "conversations/<uuid:conversation_uuid>/read/",
        MarkConversationReadView.as_view()
    ),

    # Messages
    path("conversations/<uuid:conversation_uuid>/messages/",   MessageListView.as_view()),
    path("conversations/<uuid:conversation_uuid>/send-file/",  SendFileView.as_view()),

    # Message actions
    path("messages/<int:message_id>/pin/",    PinMessageView.as_view()),
    path("messages/<int:message_id>/unpin/",  UnpinMessageView.as_view()),
    path("messages/<int:message_id>/recall/", RecallMessageView.as_view()),
    path("messages/<int:message_id>/react/",  MessageReactionView.as_view()),
    path("unread-count/", UnreadCountView.as_view()), 
]