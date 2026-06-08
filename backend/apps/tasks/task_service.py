# apps/tasks/task_service.py
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.utils import timezone

from .models import TaskActivity


class TaskActivityService:
    """
    Tạo TaskActivity và broadcast realtime qua WebSocket.
    Dùng thủ công trong từng view thay vì signals.
    """

    @staticmethod
    def create_activity(
        *,
        task,
        user,
        action,
        old_value=None,
        new_value=None,
    ) -> TaskActivity:

        activity = TaskActivity.objects.create(
            task=task,
            user=user,
            action=action,
            old_value=old_value,
            new_value=new_value,
        )

        # Build payload thủ công để tránh vòng import và đảm bảo JSON-safe
        payload = TaskActivityService._serialize(activity)

        channel_layer = get_channel_layer()

        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                "global_task_activity",
                {
                    "type": "task_activity",
                    "data": payload,
                },
            )

        return activity

    # ------------------------------------------------------------------
    # Internal serializer — không phụ thuộc DRF serializer để tránh
    # vòng import và bug duplicate get_created_at
    # ------------------------------------------------------------------
    @staticmethod
    def _serialize(activity: TaskActivity) -> dict:

        user = activity.user
        task = activity.task
        profile = getattr(user, "profile", None)

        return {
            "id": activity.id,
            "action": activity.action,
            "old_value": activity.old_value,
            "new_value": activity.new_value,
            # isoformat() → JSON-safe string
            "created_at": timezone.localtime(activity.created_at).isoformat(),
            "user": {
                "id": user.id,
                "username": user.username,
                "fullname": getattr(profile, "fullname", user.username) or user.username,
                # avatar không build absolute URI vì không có request ở đây
                # frontend tự prepend base URL nếu cần
                "avatar": (
                    profile.avatarpath.url
                    if profile and profile.avatarpath
                    else None
                ),
            },
            "task": {
                "uuid": str(task.uuid),
                "name": task.name,
                "progress": task.progress,
                "status": task.computed_status,
            },
            "project": {
                "uuid": str(task.project.uuid),
                "name": task.project.name,
            },
        }

# from channels.layers import get_channel_layer
# from asgiref.sync import async_to_sync

# from .models import TaskActivity
# from .serializers import TaskActivitySerializer


# class TaskActivityService:

#     @staticmethod
#     def create_activity(
#         *,
#         task,
#         user,
#         action,
#         old_value=None,
#         new_value=None,
#     ):

#         activity = TaskActivity.objects.create(
#             task=task,
#             user=user,
#             action=action,
#             old_value=old_value,
#             new_value=new_value,
#         )

#         serializer = TaskActivitySerializer(activity)

#         channel_layer = get_channel_layer()

#         async_to_sync(
#             channel_layer.group_send
#         )(
#             "global_task_activity",
#             {
#                 "type": "task_activity",

#                 "data": serializer.data
#             }
#         )

#         return activity

# # from channels.layers import get_channel_layer
# # from asgiref.sync import async_to_sync

# # from apps.tasks.serializers import TaskActivitySerializer
# # from .models import TaskActivity


# # class TaskActivityService:

# #     @staticmethod
# #     def create_activity(
# #         *,
# #         task,
# #         user,
# #         action,
# #         old_value=None,
# #         new_value=None,
# #     ):

# #         activity = TaskActivity.objects.create(
# #             task=task,
# #             user=user,
# #             action=action,
# #             old_value=old_value,
# #             new_value=new_value,
# #         )

# #         channel_layer = get_channel_layer()

# #         async_to_sync(
# #             channel_layer.group_send
# #         )(
# #             "global_task_activity",
# #             {
# #                 "type": "task_activity",

# #                 "data": {

# #                     "id": activity.id,

# #                     "action": activity.action,

# #                     "old_value": activity.old_value,

# #                     "new_value": activity.new_value,

# #                     "created_at": (
# #                         activity.created_at.isoformat()
# #                     ),

# #                     "user": {
# #                         "id": user.id,
# #                         "username": user.username,
# #                     },

# #                     "task": {
# #                         "uuid": str(task.uuid),
# #                         "name": task.name,
# #                         "progress": task.progress,
# #                         "status": task.status,
# #                     },

# #                     "project": {
# #                         "uuid": str(task.project.uuid),
# #                         "name": task.project.name,
# #                     }
# #                 }
# #             }
# #         )

# #         return activity