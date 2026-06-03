# apps/projects/consumers/project_consumer.py
"""
WebSocket consumer for a single project room.

Clients connect to:  ws/projects/<project_uuid>/?token=<JWT>

Messages pushed to clients:

  { "type": "project_progress",  "project_uuid": "...", "project_progress": 72 }
  { "type": "task_progress",     "task_uuid": "...",    "progress": 45, "status": "inprogress" }
  { "type": "presence_update",   "online_users": [1, 3, 7] }
"""

import json
from channels.generic.websocket import AsyncWebsocketConsumer

_online: dict[str, set] = {}


class ProjectConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.project_uuid   = self.scope["url_route"]["kwargs"]["project_uuid"]
        self.room_group     = f"project_{self.project_uuid}"
        self.user           = self.scope["user"]

        # Reject anonymous
        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        await self.channel_layer.group_add(self.room_group, self.channel_name)
        await self.accept()

        # Track presence
        if self.project_uuid not in _online:
            _online[self.project_uuid] = set()
        _online[self.project_uuid].add(self.user.id)

        await self.channel_layer.group_send(
            self.room_group,
            {
                "type"        : "presence_update",
                "online_users": list(_online[self.project_uuid]),
            },
        )

    async def disconnect(self, close_code):
        if self.project_uuid in _online:
            _online[self.project_uuid].discard(self.user.id)
            if not _online[self.project_uuid]:
                del _online[self.project_uuid]

        await self.channel_layer.group_send(
            self.room_group,
            {
                "type"        : "presence_update",
                "online_users": list(_online.get(self.project_uuid, [])),
            },
        )
        await self.channel_layer.group_discard(self.room_group, self.channel_name)

    # ── Outbound handlers ────────────────────────────────────────────────────

    async def project_progress(self, event):
        await self.send(text_data=json.dumps(event["payload"]))

    async def task_progress(self, event):
        await self.send(text_data=json.dumps(event["payload"]))

    async def presence_update(self, event):
        await self.send(text_data=json.dumps({
            "type"        : "presence_update",
            "online_users": event["online_users"],
        }))