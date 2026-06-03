# apps/groups/consumers/group_consumer.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer

# Track online users per group: { "group_uuid": set(user_id, ...) }
# Dùng class variable — đủ dùng cho single-server; thay bằng Redis nếu scale multi-server
_online: dict[str, set] = {}


class GroupConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.group_uuid = self.scope["url_route"]["kwargs"]["group_uuid"]
        self.room_group_name = f"group_{self.group_uuid}"
        self.user_id = self.scope["user"].id

        # Thêm channel vào group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name,
        )

        await self.accept()

        # Đánh dấu user này online
        if self.group_uuid not in _online:
            _online[self.group_uuid] = set()
        _online[self.group_uuid].add(self.user_id)

        # Broadcast danh sách online mới nhất cho tất cả trong nhóm
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "presence_update",
                "online_users": list(_online[self.group_uuid]),
            },
        )

    async def disconnect(self, close_code):
        # Xóa user khỏi danh sách online
        if self.group_uuid in _online:
            _online[self.group_uuid].discard(self.user_id)
            if not _online[self.group_uuid]:
                del _online[self.group_uuid]

        # Broadcast danh sách online đã cập nhật
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "presence_update",
                "online_users": list(_online.get(self.group_uuid, [])),
            },
        )

        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name,
        )

    async def presence_update(self, event):
        """Handler cho group_send type='presence_update' — gửi xuống client."""
        await self.send(
            text_data=json.dumps({
                "type": "presence_update",
                "online_users": event["online_users"],  # [user_id, ...]
            })
        )
