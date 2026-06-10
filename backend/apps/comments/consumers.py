# apps/comments/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async



# MỚI — thêm SITE_URL từ settings hoặc env
import os

def _build_request_mock(user):
    base = os.environ.get("SITE_URL", "http://localhost:8000").rstrip("/")
    class MockRequest:
        def build_absolute_uri(self, url):
            if url and url.startswith("/"):
                return f"{base}{url}"
            return url
    mock = MockRequest()
    mock.user = user
    return mock
# def _build_request_mock(user):
#     """Minimal mock so serializer's build_absolute_uri won't crash."""
#     class MockRequest:
#         def build_absolute_uri(self, url):
#             return url   # trả nguyên path, FE tự ghép VITE_API_URL nếu cần
#     mock = MockRequest()
#     mock.user = user
#     return mock


class CommentConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.user = self.scope.get("user")
        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        self.project_uuid = self.scope["url_route"]["kwargs"]["project_uuid"]
        self.room = f"comments_{self.project_uuid}"

        # Kiểm tra quyền truy cập
        has_access = await self._check_access()
        if not has_access:
            await self.close(code=4003)
            return

        await self.channel_layer.group_add(self.room, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        if hasattr(self, "room"):
            await self.channel_layer.group_discard(self.room, self.channel_name)

    async def receive(self, text_data):
        """
        Client gửi lên:
          { "type": "send_comment", "content": "...", "parent_uuid": null }
          { "type": "delete_comment", "comment_uuid": "..." }
          { "type": "pin_comment",    "comment_uuid": "..." }
        """
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return

        msg_type = data.get("type")

        if msg_type == "send_comment":
            await self._handle_send(data)
        elif msg_type == "delete_comment":
            await self._handle_delete(data)
        elif msg_type == "pin_comment":
            await self._handle_pin(data)

    # ── Handlers ──────────────────────────────────────────────────────────

    async def _handle_send(self, data):
        content     = (data.get("content") or "").strip()
        parent_uuid = data.get("parent_uuid")
        if not content:
            return

        comment = await self._create_comment(content, parent_uuid)
        if not comment:
            return

        serialized = await self._serialize_comment(comment)

        await self.channel_layer.group_send(self.room, {
            "type":        "broadcast_comment",
            "action":      "new_comment",
            "comment":     serialized,
            "parent_uuid": parent_uuid, 
        })

    async def _handle_delete(self, data):
        comment_uuid = data.get("comment_uuid")
        deleted_uuid = await self._delete_comment(comment_uuid)
        if not deleted_uuid:
            return

        await self.channel_layer.group_send(self.room, {
            "type":         "broadcast_comment",
            "action":       "delete_comment",
            "comment_uuid": deleted_uuid,
        })

    async def _handle_pin(self, data):
        comment_uuid = data.get("comment_uuid")
        result = await self._pin_comment(comment_uuid)
        if result is None:
            return

        await self.channel_layer.group_send(self.room, {
            "type":         "broadcast_comment",
            "action":       "pin_comment",
            "comment_uuid": comment_uuid,
            "pinned":       result,
        })

    # ── Broadcast handler (channels calls this) ────────────────────────────

    async def broadcast_comment(self, event):
        await self.send(text_data=json.dumps(event))

    # ── DB helpers ────────────────────────────────────────────────────────

    @database_sync_to_async
    def _check_access(self):
        from apps.projects.models import Project, UserProject
        try:
            project = Project.objects.select_related("group").get(uuid=self.project_uuid)
        except Project.DoesNotExist:
            return False
        if project.group.leader == self.user:
            return True
        return UserProject.objects.filter(
            project=project, group_member__user=self.user
        ).exists()

    @database_sync_to_async
    def _create_comment(self, content, parent_uuid):
        from apps.projects.models import Project
        from .models import Comment
        try:
            project = Project.objects.get(uuid=self.project_uuid)
        except Project.DoesNotExist:
            return None

        parent = None
        if parent_uuid:
            try:
                parent = Comment.objects.get(uuid=parent_uuid, project=project, parent__isnull=True)
            except Comment.DoesNotExist:
                return None

        return Comment.objects.create(
            project=project,
            user=self.user,
            content=content,
            parent=parent,
        )

    @database_sync_to_async
    def _serialize_comment(self, comment):
        from .models import Comment
        from .serializers import CommentSerializer, CommentReplySerializer
        comment.refresh_from_db()
        comment = (
            Comment.objects
            .select_related("user__profile")
            .prefetch_related("replies__user__profile")
            .get(pk=comment.pk)
        )
        request_mock = _build_request_mock(self.user)
        
        if comment.parent_id:
            data = CommentReplySerializer(comment, context={"request": request_mock}).data
        else:
            data = CommentSerializer(comment, context={"request": request_mock}).data
        
        # # Debug: in ra xem avatarpath thực tế là gì
        # import logging
        # logger = logging.getLogger(__name__)
        # logger.debug(f"[WS comment] avatarpath = {data.get('avatarpath')}")
        
        return data

    @database_sync_to_async
    def _delete_comment(self, comment_uuid):
        from .models import Comment
        try:
            comment = Comment.objects.select_related("project__group").get(uuid=comment_uuid)
        except Comment.DoesNotExist:
            return None

        is_owner  = comment.user == self.user
        is_leader = comment.project.group.leader == self.user
        if not (is_owner or is_leader):
            return None

        comment.delete()
        return comment_uuid

    @database_sync_to_async
    def _pin_comment(self, comment_uuid):
        from .models import Comment
        try:
            comment = Comment.objects.select_related("project__group").get(uuid=comment_uuid)
        except Comment.DoesNotExist:
            return None

        if comment.project.group.leader != self.user:
            return None

        comment.is_pinned = not comment.is_pinned
        comment.save(update_fields=["is_pinned"])
        return comment.is_pinned