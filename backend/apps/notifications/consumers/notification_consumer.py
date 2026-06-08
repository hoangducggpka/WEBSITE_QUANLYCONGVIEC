# apps/notifications/consumers/notification_consumer.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer


class NotificationConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        user = self.scope["user"]
        if not user.is_authenticated:
            await self.close()
            return

        self.group_name = f"user_{user.id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        print(f"[NotificationConsumer] User {user.id} joined {self.group_name}")

    async def disconnect(self, close_code):
        user = self.scope["user"]
        if user.is_authenticated:
            await self.channel_layer.group_discard(
                f"user_{user.id}", self.channel_name
            )

    async def notification_message(self, event):
        print("NOTIFICATION EVENT RECEIVED", event)
        await self.send(text_data=json.dumps(event["payload"]))

# #apps/notifications/notification_consumer.py
# from channels.generic.websocket import AsyncWebsocketConsumer


# class NotificationConsumer(AsyncWebsocketConsumer):

#     async def connect(self):
#         print(f"[NotificationConsumer] connect() called, scope={self.scope['type']}")
#         user = self.scope["user"]
#         print(f"[NotificationConsumer] user={user}, authenticated={user.is_authenticated}")
#         if not user.is_authenticated:
#             await self.close()
#             return

#         self.group_name = f"user_{user.id}"

#         await self.channel_layer.group_add(
#             self.group_name,
#             self.channel_name
#         )

#         await self.accept()

#         print(
#             f"[NotificationConsumer] User {user.id} joined {self.group_name}"
#         )

#     async def disconnect(self, close_code):
#         user = self.scope["user"]

#         if user.is_authenticated:
#             await self.channel_layer.group_discard(
#                 f"user_{user.id}",
#                 self.channel_name
#             )

#     async def notification_message(self, event):
#         print("NOTIFICATION EVENT RECEIVED", event)
#         await self.send_json(event["payload"])