# apps/chat/consumers/message_consumer.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async


class MessageConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.user = self.scope.get("user")
        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        self.conversation_uuid = self.scope["url_route"]["kwargs"]["conversation_id"]
        self.conversation = await self.get_conversation()
        if not self.conversation:
            await self.close(code=4004)
            return

        self.room_group_name = f"chat_{self.conversation_uuid}"
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()
        print(f"[WS] {self.user.username} connected to {self.room_group_name}")

    async def disconnect(self, close_code):
        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get("type", "text")
        content = data.get("message", "").strip()
        reply_to_id = data.get("reply_to")

        if not content:
            return

        saved = await self.save_message(content, message_type, reply_to_id)

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type":          "chat_message",
                "message_id":    saved["id"],
                "message_uuid":  saved["uuid"],
                "message":       content,
                "sender_id":     self.user.id,
                "sender_name":   saved["sender_name"],
                "sender_avatar": saved["sender_avatar"],
                "message_type":  message_type,
                "created_at":    saved["created_at"],
                "reply_to":      reply_to_id,
                "reply_to_data": saved["reply_to_data"],
                "is_pinned":     False,
                "is_deleted":    False,
                "file_url":      None,
                "file_name":     None,
            }
        )
        members = await self.get_conversation_members()

        for member_id in members:

        # Không gửi lại cho sender
            if member_id == self.user.id:
                continue

            unread_count = await self.get_total_unread(member_id)


            await self.channel_layer.group_send(
                f"user_chat_{member_id}",
                {
                    "type": "unread_message",
                    "conversation_uuid": str(self.conversation.uuid),
                    "message": content,
                    "sender_name": saved["sender_name"],
                    "sender_avatar": saved["sender_avatar"],
                    "created_at": saved["created_at"],
                    "unread_count": unread_count,
                }
            )


    # ── Event handlers (nhận từ channel layer) ───────────────────

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            "type":          "chat_message",
            "message_id":    event["message_id"],
            "message_uuid":  event["message_uuid"],
            "message":       event["message"],
            "sender_id":     event["sender_id"],
            "sender_name":   event["sender_name"],
            "sender_avatar": event["sender_avatar"],
            "message_type":  event["message_type"],
            "created_at":    event["created_at"],
            "reply_to":      event.get("reply_to"),
            "reply_to_data": event.get("reply_to_data"),
            "is_pinned":     event.get("is_pinned", False),
            "is_deleted":    event.get("is_deleted", False),
            "file_url":      event.get("file_url"),
            "file_name":     event.get("file_name"),
        }))

    async def message_recalled(self, event):
        await self.send(text_data=json.dumps({
            "type":       "message_recalled",
            "message_id": event["message_id"],
        }))

    async def message_pinned(self, event):
        await self.send(text_data=json.dumps({
            "type":         "message_pinned",
            "message_id":   event["message_id"],
            "message_data": event.get("message_data"),
        }))

    async def message_unpinned(self, event):
        await self.send(text_data=json.dumps({
            "type":       "message_unpinned",
            "message_id": event["message_id"],
        }))
    async def message_reacted(self, event):
        return
        # await self.send(text_data=json.dumps({
        #     "type":       "message_reacted",
        #     "message_id": event["message_id"],
        #     "reactions":  event["reactions"],
        # }))

    # ── DB helpers ────────────────────────────────────────────────

    @database_sync_to_async
    def get_conversation(self):
        from apps.chat.models import Conversation, ConversationMember
        try:
            conv = Conversation.objects.get(uuid=self.conversation_uuid)
            is_member = ConversationMember.objects.filter(
                conversation=conv, user=self.user
            ).exists()
            return conv if is_member else None
        except Conversation.DoesNotExist:
            return None

    @database_sync_to_async
    def save_message(self, content, msg_type="text", reply_to_id=None):
        from apps.chat.models import Message

        reply_to = None
        reply_to_data = None
        if reply_to_id:
            try:
                reply_to = Message.objects.select_related(
                    "sender__profile"
                ).get(id=reply_to_id, conversation=self.conversation)

                reply_to_data = {
                    "id":          reply_to.id,
                    "content":     reply_to.content,
                    "sender_name": (
                        reply_to.sender.profile.fullname
                        if reply_to.sender and hasattr(reply_to.sender, "profile")
                        else (reply_to.sender.username if reply_to.sender else "Unknown")
                    ),
                    "type": reply_to.type,
                }
            except Message.DoesNotExist:
                pass

        msg = Message.objects.create(
            conversation=self.conversation,
            sender=self.user,
            content=content,
            type=msg_type,
            reply_to=reply_to,
        )

        avatar = None
        if hasattr(self.user, "profile") and self.user.profile.avatarpath:
            avatar = self.user.profile.avatarpath.url

        sender_name = (
            self.user.profile.fullname
            if hasattr(self.user, "profile") and self.user.profile.fullname
            else self.user.username
        )

        return {
            "id":            msg.id,
            "uuid":          str(msg.uuid),
            "created_at":    msg.created_at.isoformat(),
            "sender_avatar": avatar,
            "sender_name":   sender_name,
            "reply_to_data": reply_to_data,
        }

    @database_sync_to_async
    def get_conversation_members(self):
        return list(
        self.conversation.members.values_list("user_id", flat=True)
        )

    @database_sync_to_async
    def get_total_unread(self, user_id):
        from apps.chat.services.chat_service import get_total_unread_for_user
        from django.contrib.auth.models import User

        user = User.objects.get(id=user_id)
        return get_total_unread_for_user(user)
    @database_sync_to_async
    def get_conversation_unread(self, user_id):
        from apps.chat.services.chat_service import get_conversation_unread_for_user
        from django.contrib.auth.models import User

        user = User.objects.get(id=user_id)
        return get_conversation_unread_for_user(self.conversation, user)
    
    # @database_sync_to_async
    # def get_total_unread(self, user_id):
    #     from apps.chat.models import ConversationMember

    #     total = 0

    #     members = ConversationMember.objects.filter(
    #         user_id=user_id
    #     ).select_related("conversation")

    #     for member in members:

    #         if member.last_seen is None:
    #             count = member.conversation.messages.exclude(
    #                 sender_id=user_id
    #             ).count()

    #         else:
    #             count = member.conversation.messages.filter(
    #                 created_at__gt=member.last_seen,
    #                 is_deleted=False
    #             ).exclude(
    #                 sender_id=user_id
    #             ).count()

    #         total += count

    #     return total


    # @database_sync_to_async
    # def get_unread_count(self, user_id):

    #     from apps.chat.models import ConversationMember

    #     try:
    #         member = ConversationMember.objects.get(
    #             conversation=self.conversation,
    #             user_id=user_id
    #         )

    #         if member.last_seen is None:
    #             return self.conversation.messages.exclude(
    #                 sender_id=user_id
    #             ).count()

    #         return self.conversation.messages.filter(
    #             created_at__gt=member.last_seen
    #         ).exclude(
    #             sender_id=user_id
    #         ).count()

    #     except ConversationMember.DoesNotExist:
    #         return 0
