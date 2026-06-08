from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .models import TaskActivity


class TaskActivityService:

    @staticmethod
    def create_activity(
        *,
        task,
        user,
        action,
        old_value=None,
        new_value=None,
    ):

        activity = TaskActivity.objects.create(
            task=task,
            user=user,
            action=action,
            old_value=old_value,
            new_value=new_value,
        )

        channel_layer = get_channel_layer()

        async_to_sync(
            channel_layer.group_send
        )(
            "global_task_activity",
            {
                "type": "task_activity",

                "data": {

                    "id": activity.id,

                    "action": activity.action,

                    "old_value": activity.old_value,

                    "new_value": activity.new_value,

                    "created_at": (
                        activity.created_at.isoformat()
                    ),

                    "user": {
                        "id": user.id,
                        "username": user.username,
                    },

                    "task": {
                        "uuid": str(task.uuid),
                        "name": task.name,
                        "progress": task.progress,
                        "status": task.status,
                    },

                    "project": {
                        "uuid": str(task.project.uuid),
                        "name": task.project.name,
                    }
                }
            }
        )

        return activity