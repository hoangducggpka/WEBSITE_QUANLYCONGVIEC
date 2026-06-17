#apps/chat/consumers/global_consumer.py
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
import json

class GlobalChatConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.user = self.scope.get("user")

        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        self.group_name = f"user_chat_{self.user.id}"

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()

        print(f"[GLOBAL CHAT] {self.user.username} connected")


    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )


    async def unread_message(self, event):
        await self.send(text_data=json.dumps({
            "type": "unread_message",
            "conversation_uuid": event["conversation_uuid"],
            "message": event["message"],
            "sender_name": event["sender_name"],
            "sender_avatar": event["sender_avatar"],
            "created_at": event["created_at"],
            "unread_count": event["unread_count"],
        }))

    @database_sync_to_async
    def get_total_unread(self):
        from apps.chat.services.chat_service import get_total_unread_for_user
        return get_total_unread_for_user(self.user)
    # @database_sync_to_async
    # def get_total_unread(self):


    #     from apps.chat.models import ConversationMember

    #     total = 0

    #     members = ConversationMember.objects.filter(
    #         user=self.user
    #     ).select_related("conversation")

    #     for member in members:

    #         if member.last_seen is None:
    #             count = member.conversation.messages.exclude(
    #                 sender=self.user
    #             ).count()

    #         else:
    #             count = member.conversation.messages.filter(
    #                 created_at__gt=member.last_seen,
    #                 is_deleted=False
    #             ).exclude(
    #                 sender=self.user
    #             ).count()

    #         total += count

    #     return total


