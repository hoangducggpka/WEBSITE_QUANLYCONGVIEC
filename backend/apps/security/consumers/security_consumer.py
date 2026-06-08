#apps/security/consumers/security_consumer.py
from channels.generic.websocket import AsyncJsonWebsocketConsumer


class SecurityConsumer(AsyncJsonWebsocketConsumer):

    async def connect(self):

        await self.channel_layer.group_add(
            "security_alerts",
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):

        await self.channel_layer.group_discard(
            "security_alerts",
            self.channel_name
        )

    async def security_message(self, event):

        await self.send_json(event["data"])