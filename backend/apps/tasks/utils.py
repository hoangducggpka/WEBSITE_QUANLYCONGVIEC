# apps/tasks/utils.py
"""Utility helpers: project progress recalc + WebSocket broadcast."""

from __future__ import annotations

import json
from typing import Union
from uuid import UUID


def update_project_progress(project) -> int:
    """Recalculate project progress (% done tasks) and persist."""
    from django.db.models import Count, Q
    from apps.tasks.models import Task

    stats = project.tasks.aggregate(
        total = Count("id"),
        done  = Count("id", filter=Q(is_approved=True)),
    )
    total = stats["total"]
    done  = stats["done"]
    progress = int((done / total) * 100) if total > 0 else 0

    project.progress = progress
    project.save(update_fields=["progress"])
    return progress


def broadcast_project_progress(project_uuid: Union[str, UUID], progress: int) -> None:
    """
    Push project progress update to the WebSocket group for this project.
    Room name: project_<uuid>
    """
    try:
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer

        channel_layer = get_channel_layer()
        if not channel_layer:
            return

        async_to_sync(channel_layer.group_send)(
            f"project_{project_uuid}",
            {
                "type"    : "project_progress",
                "payload" : {
                    "type"             : "project_progress",
                    "project_uuid"     : str(project_uuid),
                    "project_progress" : progress,
                },
            },
        )
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning(f"broadcast_project_progress failed: {exc}")


def broadcast_task_progress(task_uuid: Union[str, UUID], progress: int, status: str) -> None:
    """
    Push individual task progress update to the WebSocket group.
    Room name: project_<project_uuid>  — obtained from the Task record.
    """
    try:
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer
        from apps.tasks.models import Task

        task = Task.objects.select_related("project").get(uuid=task_uuid)

        channel_layer = get_channel_layer()
        if not channel_layer:
            return

        async_to_sync(channel_layer.group_send)(
            f"project_{task.project.uuid}",
            {
                "type"    : "task_progress",
                "payload" : {
                    "type"      : "task_progress",
                    "task_uuid" : str(task_uuid),
                    "progress"  : progress,
                    "status"    : status,
                },
            },
        )
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning(f"broadcast_task_progress failed: {exc}")