import json

from channels.generic.websocket import AsyncWebsocketConsumer


class TaskActivityConsumer(AsyncWebsocketConsumer):

    async def connect(self):

        self.room_name = "global_task_activity"

        user = self.scope.get("user")

        if not user or user.is_anonymous:
            await self.close()
            return

        await self.channel_layer.group_add(
            self.room_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):

        await self.channel_layer.group_discard(
            self.room_name,
            self.channel_name
        )

    async def receive(self, text_data):

        # Optional:
        # handle incoming client messages

        try:

            data = json.loads(text_data)

            print("CLIENT MESSAGE:", data)

        except Exception as e:

            print("SOCKET ERROR:", str(e))

    async def task_activity(self, event):

        await self.send(
            text_data=json.dumps(
                event["data"]
            )
        )