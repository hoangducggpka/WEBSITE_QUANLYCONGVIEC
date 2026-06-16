#apps/groups/consumers/presence_consumer.py
import json

from channels.generic.websocket import AsyncWebsocketConsumer

ONLINE_USERS = set()


class PresenceConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        user = self.scope["user"]

        if not user.is_authenticated:
            await self.close()
            return

        self.user_id = user.id

        await self.accept()

        ONLINE_USERS.add(self.user_id)

        await self.channel_layer.group_add(
            "presence",
            self.channel_name,
        )

        await self.channel_layer.group_send(
            "presence",
            {
                "type": "presence_update",
                "online_users": list(ONLINE_USERS),
            },
        )

    async def disconnect(self, close_code):

        ONLINE_USERS.discard(self.user_id)

        print("ONLINE:", ONLINE_USERS)

        await self.channel_layer.group_send(
            "presence",
            {
                "type": "presence_update",
                "online_users": list(ONLINE_USERS),
            },
        )

        await self.channel_layer.group_discard(
            "presence",
            self.channel_name,
        )

    async def presence_update(self, event):
        await self.send(
            text_data=json.dumps({
                "type": "presence_update",
                "online_users": event["online_users"],
            })
        )