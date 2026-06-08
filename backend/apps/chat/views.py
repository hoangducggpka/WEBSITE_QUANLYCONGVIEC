# apps/chat/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.contrib.auth.models import User
from django.utils import timezone

from .models import Conversation, ConversationMember, Message, MessageReaction
from .serializers import ConversationSerializer, MessageSerializer
from apps.chat.services.chat_service import (
    get_or_create_private_conversation,
    get_or_create_group_conversation,
)


# ─────────────────────────────────────────────
# Conversations
# ─────────────────────────────────────────────

class ConversationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        conversations = (
            Conversation.objects
            .filter(members__user=request.user)
            .select_related("group")
            .prefetch_related("members__user__profile", "messages")
            .order_by("-created_at")
        )
        serializer = ConversationSerializer(
            conversations, many=True, context={"request": request}
        )
        return Response(serializer.data)

    def post(self, request):
        target_user_id = request.data.get("user_id")
        try:
            target_user = User.objects.get(id=target_user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)

        conv = get_or_create_private_conversation(request.user, target_user)
        serializer = ConversationSerializer(conv, context={"request": request})
        return Response(serializer.data)


class GroupConversationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from apps.groups.models import Group
        try:
            group = Group.objects.prefetch_related("members__user").get(
                id=request.data["group_id"]
            )
        except Group.DoesNotExist:
            return Response({"error": "Group not found"}, status=404)

        conv = get_or_create_group_conversation(group)
        serializer = ConversationSerializer(conv, context={"request": request})
        return Response(serializer.data)


# ─────────────────────────────────────────────
# Messages
# ─────────────────────────────────────────────

class MessageListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, conversation_uuid):
        try:
            conv = Conversation.objects.get(uuid=conversation_uuid)
        except Conversation.DoesNotExist:
            return Response({"error": "Not found"}, status=404)

        if not conv.members.filter(user=request.user).exists():
            return Response({"error": "Forbidden"}, status=403)

        # Cập nhật last_seen
        ConversationMember.objects.filter(
            conversation=conv, user=request.user
        ).update(last_seen=timezone.now())

        before_id = request.query_params.get("before")
        messages = (
            conv.messages
            .filter(is_deleted=False)
            .select_related("sender__profile", "reply_to__sender__profile")
            .prefetch_related("reactions__user")
            .order_by("-created_at")
        )

        if before_id:
            messages = messages.filter(id__lt=before_id)

        messages = list(reversed(list(messages[:50])))

        serializer = MessageSerializer(messages, many=True, context={"request": request})
        return Response(serializer.data)


class SendFileView(APIView):
    """POST /api/chat/conversations/<uuid>/send-file/"""
    permission_classes = [IsAuthenticated]

    def post(self, request, conversation_uuid):
        try:
            conv = Conversation.objects.get(uuid=conversation_uuid)
        except Conversation.DoesNotExist:
            return Response({"error": "Not found"}, status=404)

        if not conv.members.filter(user=request.user).exists():
            return Response({"error": "Forbidden"}, status=403)

        file = request.FILES.get("file")
        if not file:
            return Response({"error": "No file"}, status=400)

        msg_type = request.data.get("type", "file")
        reply_to_id = request.data.get("reply_to")

        reply_to = None
        if reply_to_id:
            try:
                reply_to = Message.objects.get(id=reply_to_id, conversation=conv)
            except Message.DoesNotExist:
                pass

        msg = Message.objects.create(
            conversation=conv,
            sender=request.user,
            type=msg_type,
            file=file,
            reply_to=reply_to,
        )

        # Broadcast qua WS
        from apps.chat.services.chat_service import _broadcast_message
        # views.py — SendFileView.post()
        _broadcast_message(request.user, msg, request=request)  # ← thêm request=request

        serializer = MessageSerializer(msg, context={"request": request})
        return Response(serializer.data, status=201)


# ─────────────────────────────────────────────
# Pin / Unpin
# ─────────────────────────────────────────────

class PinMessageView(APIView):
    """POST /api/chat/messages/<id>/pin/"""
    permission_classes = [IsAuthenticated]

    def post(self, request, message_id):
        try:
            msg = Message.objects.select_related("conversation").get(id=message_id)
        except Message.DoesNotExist:
            return Response({"error": "Not found"}, status=404)

        if not msg.conversation.members.filter(user=request.user).exists():
            return Response({"error": "Forbidden"}, status=403)

        msg.is_pinned = True
        msg.save(update_fields=["is_pinned"])

        # Broadcast
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"chat_{msg.conversation.uuid}",
            {
                "type": "message_pinned",
                "message_id": msg.id,
                "message_data": MessageSerializer(msg, context={"request": request}).data,
            }
        )

        return Response({"pinned": True})


class UnpinMessageView(APIView):
    """POST /api/chat/messages/<id>/unpin/"""
    permission_classes = [IsAuthenticated]

    def post(self, request, message_id):
        try:
            msg = Message.objects.select_related("conversation").get(id=message_id)
        except Message.DoesNotExist:
            return Response({"error": "Not found"}, status=404)

        if not msg.conversation.members.filter(user=request.user).exists():
            return Response({"error": "Forbidden"}, status=403)

        msg.is_pinned = False
        msg.save(update_fields=["is_pinned"])

        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"chat_{msg.conversation.uuid}",
            {
                "type": "message_unpinned",
                "message_id": msg.id,
            }
        )

        return Response({"pinned": False})


# ─────────────────────────────────────────────
# Recall (thu hồi)
# ─────────────────────────────────────────────

class RecallMessageView(APIView):
    """POST /api/chat/messages/<id>/recall/"""
    permission_classes = [IsAuthenticated]

    def post(self, request, message_id):
        try:
            msg = Message.objects.select_related("conversation").get(id=message_id)
        except Message.DoesNotExist:
            return Response({"error": "Not found"}, status=404)

        if msg.sender != request.user:
            return Response({"error": "Chỉ người gửi mới có thể thu hồi"}, status=403)

        # Kiểm tra 15 phút
        diff = (timezone.now() - msg.created_at).total_seconds() / 60
        if diff > 15:
            return Response({"error": "Đã quá 15 phút, không thể thu hồi"}, status=400)

        msg.is_deleted = True
        msg.content = "Tin nhắn đã được thu hồi"
        msg.save(update_fields=["is_deleted", "content"])

        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"chat_{msg.conversation.uuid}",
            {
                "type": "message_recalled",
                "message_id": msg.id,
            }
        )

        return Response({"recalled": True})


# ─────────────────────────────────────────────
# Reactions
# ─────────────────────────────────────────────

class MessageReactionView(APIView):
    """
    POST /api/chat/messages/<id>/react/   body: { emoji: "👍" }
    Toggle: nếu đã react emoji đó thì xóa, chưa thì thêm.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, message_id):
        try:
            msg = Message.objects.select_related("conversation").get(id=message_id)
        except Message.DoesNotExist:
            return Response({"error": "Not found"}, status=404)

        if not msg.conversation.members.filter(user=request.user).exists():
            return Response({"error": "Forbidden"}, status=403)

        emoji = request.data.get("emoji", "").strip()
        if not emoji:
            return Response({"error": "emoji required"}, status=400)

        reaction, created = MessageReaction.objects.get_or_create(
            message=msg,
            user=request.user,
            emoji=emoji,
        )

        if not created:
            # Đã react → toggle off
            reaction.delete()
            action = "removed"
        else:
            action = "added"

        # Sau khi xử lý reaction, broadcast lên WS
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync

        msg.refresh_from_db()
        serializer = MessageSerializer(msg, context={"request": request})
        reactions_data = serializer.data["reactions"]

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"chat_{msg.conversation.uuid}",
            {
                "type": "message_reacted",
                "message_id": msg.id,
                "reactions": reactions_data,
            }
        )

        return Response({"action": action, "reactions": reactions_data})
# # apps/chat/views.py
# from rest_framework.views import APIView
# from rest_framework.response import Response
# from rest_framework.permissions import IsAuthenticated
# from rest_framework import status
# from django.contrib.auth.models import User
# from django.utils import timezone

# from .models import Conversation, ConversationMember, Message
# from .serializers import ConversationSerializer, MessageSerializer
# from apps.chat.services.chat_service import get_or_create_private_conversation

# from apps.chat.services.chat_service import (
#     get_or_create_private_conversation,
#     get_or_create_group_conversation
# )
# class ConversationListView(APIView):
#     """
#     GET  /api/chat/conversations/         → Danh sách conversation của user
#     POST /api/chat/conversations/         → Tạo private conversation với 1 user
#     """
#     permission_classes = [IsAuthenticated]

#     def get(self, request):
#         conversations = Conversation.objects.filter(
#             members__user=request.user
#         ).select_related("group").prefetch_related(
#             "members__user__profile", "messages"
#         ).order_by("-created_at")

#         serializer = ConversationSerializer(
#             conversations, many=True, context={"request": request}
#         )
#         return Response(serializer.data)
#     def post(self, request):
#         target_user_id = request.data.get("user_id")

#         target_user = User.objects.get(id=target_user_id)

#         conv = get_or_create_private_conversation(
#             request.user,
#             target_user
#         )

#         serializer = ConversationSerializer(conv, context={"request": request})
#         return Response(serializer.data)
#     # def post(self, request):
#     #     target_user_id = request.data.get("user_id")
#     #     if not target_user_id:
#     #         return Response({"error": "user_id required"}, status=400)

#     #     try:
#     #         target_user = User.objects.get(id=target_user_id)
#     #     except User.DoesNotExist:
#     #         return Response({"error": "User not found"}, status=404)

#     #     # Kiểm tra đã có conversation private chưa
#     #     existing = Conversation.objects.filter(
#     #         type="private",
#     #         members__user=request.user
#     #     ).filter(
#     #         members__user=target_user
#     #     ).first()

#     #     if existing:
#     #         serializer = ConversationSerializer(existing, context={"request": request})
#     #         return Response(serializer.data)

#     #     # Tạo mới
#     #     conv = Conversation.objects.create(type="private")
#     #     ConversationMember.objects.create(conversation=conv, user=request.user)
#     #     ConversationMember.objects.create(conversation=conv, user=target_user)

#     #     serializer = ConversationSerializer(conv, context={"request": request})
#     #     return Response(serializer.data, status=201)


# class GroupConversationView(APIView):
#     permission_classes = [IsAuthenticated]
#     def post(self, request):
#         from apps.groups.models import Group
#         from apps.chat.services.chat_service import get_or_create_group_conversation

#         group = Group.objects.prefetch_related("members__user").get(
#             id=request.data["group_id"]
#         )

#         conv = get_or_create_group_conversation(group)

#         serializer = ConversationSerializer(conv, context={"request": request})
#         return Response(serializer.data)
#     # def post(self, request):
#     #     from apps.groups.models import Group

#     #     group_id = request.data.get("group_id")
#     #     try:
#     #         group = Group.objects.prefetch_related("members__user").get(id=group_id)
#     #     except Group.DoesNotExist:
#     #         return Response({"error": "Group not found"}, status=404)

#     #     # Tạo hoặc lấy conversation đã có cho group này
#     #     conv, created = Conversation.objects.get_or_create(
#     #         type="group",
#     #         group=group,
#     #     )

#     #     if created:
#     #         # Thêm leader + tất cả members
#     #         all_users = set()
#     #         all_users.add(group.leader)
#     #         for m in group.members.all():
#     #             all_users.add(m.user)
#     #         for u in all_users:
#     #             ConversationMember.objects.get_or_create(conversation=conv, user=u)

#     #     serializer = ConversationSerializer(conv, context={"request": request})
#     #     return Response(serializer.data, status=201 if created else 200)


# class MessageListView(APIView):
#     """
#     GET /api/chat/conversations/<uuid>/messages/   → Load lịch sử chat (phân trang)
#     """
#     permission_classes = [IsAuthenticated]

#     def get(self, request, conversation_uuid):
#         try:
#             conv = Conversation.objects.get(uuid=conversation_uuid)
#         except Conversation.DoesNotExist:
#             return Response({"error": "Not found"}, status=404)

#         # Kiểm tra quyền
#         if not conv.members.filter(user=request.user).exists():
#             return Response({"error": "Forbidden"}, status=403)

#         # Cập nhật last_seen
#         ConversationMember.objects.filter(
#             conversation=conv, user=request.user
#         ).update(last_seen=timezone.now())

#         # Phân trang đơn giản: ?before=<message_id>
#         before_id = request.query_params.get("before")
#         messages = conv.messages.filter(is_deleted=False).select_related(
#             "sender__profile"
#         ).order_by("-created_at")

#         if before_id:
#             messages = messages.filter(id__lt=before_id)

#         messages = messages[:50]  # 50 tin mỗi lần

#         serializer = MessageSerializer(
#             reversed(list(messages)), many=True, context={"request": request}
#         )
#         return Response(serializer.data)