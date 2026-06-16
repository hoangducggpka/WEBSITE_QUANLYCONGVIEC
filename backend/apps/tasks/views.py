
# apps/tasks/views.py
from __future__ import annotations

import os, json
import google.generativeai as genai
from django.conf import settings
from apps.notifications.notification_service import create_notification_and_broadcast

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db.models import Count, Q
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.notifications.models import Notification
from apps.projects.models import Project
from .models import Task, TaskActivity
from .serializers import (
    BulkTaskCreateSerializer,
    UpdateTaskProgressSerializer,
    ApproveTaskSerializer,
    UpdateTaskStatusSerializer,
    UserTaskListSerializer,
    WarningTaskSerializer,
    TaskActivitySerializer
)
from .utils import update_project_progress, broadcast_project_progress, broadcast_task_progress

class TaskActivityListView(APIView):
    """
    GET /tasks/activity/
    Query params:
      - limit  (int, default=20, max=100)
    """
    permission_classes = [IsAuthenticated]
 
    def get(self, request):
 
        limit = min(
            int(request.query_params.get("limit", 20)),
            100,
        )
 
        activities = (
            TaskActivity.objects
            .select_related(
                "user__profile",
                "task__project",
            )
            .order_by("-created_at")[:limit]
        )
 
        from .serializers import TaskActivitySerializer
        serializer = TaskActivitySerializer(
            activities,
            many=True,
            context={"request": request},
        )
 
        return Response(serializer.data)
 
 
class TaskActivityDeleteView(APIView):
    """
    DELETE /projects/activity/<activity_id>/delete/
    Chỉ owner hoặc leader của project mới được xóa.
    """
    permission_classes = [IsAuthenticated]
 
    def delete(self, request, activity_id):
 
        try:
            activity = TaskActivity.objects.select_related(
                "user",
                "task__project__group",
            ).get(id=activity_id)
 
        except TaskActivity.DoesNotExist:
            return Response(
                {"detail": "Activity not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
 
        is_owner  = activity.user == request.user
        is_leader = (
            hasattr(activity.task.project, "group")
            and activity.task.project.group.leader == request.user
        )
 
        if not (is_owner or is_leader):
            return Response(
                {"detail": "Permission denied."},
                status=status.HTTP_403_FORBIDDEN,
            )
 
        activity.delete()
 
        return Response(status=status.HTTP_204_NO_CONTENT)
def _leader_name(user) -> str:
    profile = getattr(user, "profile", None)
    return profile.fullname if profile and profile.fullname else user.username


# ─────────────────────────────────────────────────────────────────────────────
# Bulk create tasks
# ─────────────────────────────────────────────────────────────────────────────



class BulkRemindTaskView(APIView):
    permission_classes = [IsAuthenticated]
 
    def post(self, request):
        task_uuids  = request.data.get("task_uuids", [])
        custom_msg  = request.data.get("message", "")
 
        if not task_uuids:
            return Response({"error": "Cần cung cấp task_uuids"}, status=400)
 
        tasks = Task.objects.select_related(
            "project__group", "assigned_to__group_member__user"
        ).filter(uuid__in=task_uuids)
 
        leader_name   = _leader_name(request.user)
        notifications = []
 
        for task in tasks:
            if task.project.group.leader != request.user:
                return Response({"error": "Chỉ Leader mới có thể nhắc nhở"}, status=403)
            if not task.assigned_to:
                continue
            notifications.append(
                Notification(
                    user     = task.assigned_to.group_member.user,
                    content  = (
                        f"{leader_name} | {task.project.group.name} | "
                        f"Nhắc nhở: '{task.name}' – {custom_msg or 'Hãy cập nhật tiến độ!'}"
                    ),
                    project  = task.project,
                    priority = 2,
                )
            )
 
        if notifications:
            Notification.objects.bulk_create(notifications)
 
        return Response({"message": f"Đã gửi nhắc nhở {len(notifications)} task"}, status=200)
 
class BulkRedoTaskView(APIView):
    permission_classes = [IsAuthenticated]
 
    def post(self, request):
        task_uuids = request.data.get("task_uuids", [])
        reason     = request.data.get("reason", "")
 
        if not task_uuids:
            return Response({"error": "Cần cung cấp task_uuids"}, status=400)
 
        tasks = Task.objects.select_related(
            "project__group", "assigned_to__group_member__user"
        ).filter(uuid__in=task_uuids)
 
        if not tasks.exists():
            return Response({"error": "Không tìm thấy task"}, status=404)
 
        leader_name   = _leader_name(request.user)
        notifications = []
 
        for task in tasks:
            if task.project.group.leader != request.user:
                return Response({"error": "Chỉ Leader mới có thể yêu cầu làm lại"}, status=403)
 
            task.progress    = 0
            task.is_approved = False
            task.redoReason  = reason
            task.sync_status()
            task.save(update_fields=["progress", "is_approved", "redoReason", "status"])
 
            if task.assigned_to:
                notifications.append(
                    Notification(
                        user     = task.assigned_to.group_member.user,
                        content  = (
                            f"{leader_name} | {task.project.group.name} | "
                            f"Yêu cầu làm lại task '{task.name}'"
                            + (f": {reason}" if reason else "")
                        ),
                        project  = task.project,
                        priority = 3,
                    )
                )
 
        if notifications:
            Notification.objects.bulk_create(notifications)
 
        # Broadcast progress
        if tasks.exists():
            project  = tasks.first().project
            progress = update_project_progress(project)
            broadcast_project_progress(project.uuid, progress)
 
        return Response({"message": f"Đã yêu cầu làm lại {tasks.count()} task"}, status=200)
 
 
class BulkRateTaskView(APIView):
    permission_classes = [IsAuthenticated]
 
    RATED_CHOICES = {"bad", "average", "good", "excellent"}
 
    def patch(self, request):
        task_uuids = request.data.get("task_uuids", [])
        rated      = request.data.get("rated")
 
        if not task_uuids:
            return Response({"error": "Cần cung cấp task_uuids"}, status=400)
        if rated not in self.RATED_CHOICES:
            return Response({"error": f"rated phải là một trong: {', '.join(self.RATED_CHOICES)}"}, status=400)
 
        tasks = Task.objects.select_related("project__group").filter(uuid__in=task_uuids)
 
        if not tasks.exists():
            return Response({"error": "Không tìm thấy task"}, status=404)
 
        # Kiểm tra leader
        for task in tasks:
            if task.project.group.leader != request.user:
                return Response({"error": "Chỉ Leader mới có thể đánh giá task"}, status=403)
 
        updated = tasks.update(rated=rated)
        return Response({"message": f"Đã đánh giá {updated} task", "rated": rated}, status=200)

class RequestHelpView(APIView):
    """
    Member bật/tắt cờ need_help trên task của mình.
    POST /tasks/<task_uuid>/request-help/
    Body: { "need_help": true / false }
    """
    permission_classes = [IsAuthenticated]
 
    def post(self, request, task_uuid):
        try:
            task = Task.objects.select_related(
                "project__group", "assigned_to__group_member__user"
            ).get(uuid=task_uuid)
        except Task.DoesNotExist:
            return Response({"error": "Task không tồn tại"}, status=404)
 
        # Chỉ người được giao mới được gửi yêu cầu
        if not task.assigned_to or task.assigned_to.group_member.user != request.user:
            return Response({"error": "Bạn không được giao task này"}, status=403)
 
        need_help = request.data.get("need_help", True)
        task.need_help = need_help
        task.save(update_fields=["need_help"])
 
        if need_help:
            leader      = task.project.group.leader
            member_name = getattr(getattr(request.user, "profile", None), "fullname", None) or request.user.username
            Notification.objects.create(
                user     = leader,
                content  = (
                    f"{member_name} | {task.project.group.name} | "
                    f"{member_name} cần hỗ trợ cho task '{task.name}'"
                ),
                project  = task.project,
                priority = 2,
            )
 
        return Response({
            "message"  : "Đã gửi yêu cầu hỗ trợ" if need_help else "Đã hủy yêu cầu hỗ trợ",
            "need_help": task.need_help,
        }, status=200)
 

class BulkCreateTaskView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, project_uuid):
        try:
            project = Project.objects.select_related("group").get(uuid=project_uuid)
        except Project.DoesNotExist:
            return Response({"error": "Không tìm thấy dự án"}, status=404)

        if project.computed_status == "finished":
            return Response({"error": "Dự án đã kết thúc, bạn không thể tạo thêm task"}, status=400)

        if project.group.leader != request.user:
            return Response({"error": "Chỉ có Trưởng nhóm mới có thể tạo task"}, status=403)

        current_count  = project.tasks.count()
        incoming_count = len(request.data.get("tasks", []))
        if current_count + incoming_count > 50:
            return Response(
                {"error": f"Project chỉ được tối đa 50 tasks. Hiện tại đã có {current_count}"},
                status=400,
            )

        serializer = BulkTaskCreateSerializer(data=request.data, context={"project": project})
        serializer.is_valid(raise_exception=True)
        tasks = serializer.save()

        creator_name = _leader_name(request.user)
        group_name   = project.group.name
        project_name = project.name

        # ── Gửi notification realtime cho từng member được assign ──────
        for task in tasks:
            if task.assigned_to:
                target_user = task.assigned_to.group_member.user
                create_notification_and_broadcast(
                    user=target_user,
                    content=f"{creator_name} ({group_name}) đã giao một công việc cho bạn: '{task.name}'",
                    group_name=f"user_{target_user.id}",
                    priority=1,
                    extra={"task_uuid": str(task.uuid), "project_uuid": str(project.uuid)},
                )

        # Broadcast updated project progress via WS
        progress = update_project_progress(project)
        broadcast_project_progress(project.uuid, progress)

        return Response(
            {"created": len(tasks), "task_uuids": [str(t.uuid) for t in tasks]},
            status=201,
        )

# class BulkCreateTaskView(APIView):
#     permission_classes = [IsAuthenticated]

#     def post(self, request, project_uuid):
#         try:
#             project = Project.objects.select_related("group").get(uuid=project_uuid)
#         except Project.DoesNotExist:
#             return Response({"error": "Không tìm thấy dự án"}, status=404)

#         if project.computed_status == "finished":
#             return Response({"error": "Dự án đã kết thúc, bạn không thể tạo thêm task"}, status=400)

#         if project.group.leader != request.user:
#             return Response({"error": "Chỉ có Trưởng nhóm mới có thể tạo task"}, status=403)

#         current_count  = project.tasks.count()
#         incoming_count = len(request.data.get("tasks", []))
#         if current_count + incoming_count > 50:
#             return Response(
#                 {"error": f"Project chỉ được tối đa 50 tasks. Hiện tại đã có {current_count}"},
#                 status=400,
#             )

#         serializer = BulkTaskCreateSerializer(data=request.data, context={"project": project})
#         serializer.is_valid(raise_exception=True)
#         tasks = serializer.save()

#         creator_name = _leader_name(request.user)
#         group_name   = project.group.name
#         notifications = []

#         for task in tasks:
#             if task.assigned_to:
#                 notifications.append(
#                     Notification(
#                         user    = task.assigned_to.group_member.user,
#                         content = f"{creator_name} ({group_name}) đã giao một công việc cho bạn: '{task.name}'",
#                         priority = 1,
#                         project = project,
#                     )
#                 )
                

#         if notifications:
#             Notification.objects.bulk_create(notifications)

#         # Broadcast updated project progress via WS
#         progress = update_project_progress(project)
#         broadcast_project_progress(project.uuid, progress)

#         return Response(
#             {"created": len(tasks), "task_uuids": [str(t.uuid) for t in tasks]},
#             status=201,
#         )


# ─────────────────────────────────────────────────────────────────────────────
# Bulk delete tasks
# ─────────────────────────────────────────────────────────────────────────────

class DeleteTaskView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        task_uuids = request.data.get("task_uuids", [])
        if not task_uuids:
            return Response({"error": "No task UUIDs provided"}, status=400)

        tasks = Task.objects.select_related(
            "project__group", "assigned_to__group_member__user"
        ).filter(uuid__in=task_uuids)

        if not tasks.exists():
            return Response({"error": "Tasks not found"}, status=404)

        if tasks.filter(project__group__leader=request.user).count() != tasks.count():
            return Response({"error": "Only leader can delete tasks"}, status=403)

        project = tasks.first().project
        if project.computed_status == "finished":
            return Response({"error": "Dự án đã kết thúc, bạn không thể xóa công việc!"}, status=403)

        leader_name = _leader_name(request.user)
        group_name  = project.group.name

        # Lưu trước danh sách (task, user) cần báo, vì sau khi tasks.delete() sẽ không truy cập được nữa
        targets = [
            (task.name, task.assigned_to.group_member.user)
            for task in tasks
            if task.assigned_to
        ]

        deleted_count = tasks.count()
        tasks.delete()

        for task_name, target_user in targets:
            create_notification_and_broadcast(
                user=target_user,
                content=f"{leader_name} | {group_name} | Công việc '{task_name}' của bạn đã bị xóa!",
                group_name=f"user_{target_user.id}",
                priority=3,
            )

        progress = update_project_progress(project)
        broadcast_project_progress(project.uuid, progress)

        return Response({"message": f"Deleted {deleted_count} tasks", "project_progress": progress}, status=200)


# ─────────────────────────────────────────────────────────────────────────────
# Update task meta (name / dates) — leader only
# ─────────────────────────────────────────────────────────────────────────────
class UpdateTaskView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, task_uuid):
        try:
            task = Task.objects.select_related("project__group").get(uuid=task_uuid)
        except Task.DoesNotExist:
            return Response({"error": "Task không tồn tại"}, status=404)

        if task.project.group.leader != request.user:
            return Response({"error": "Chỉ Leader mới có quyền cập nhật task"}, status=403)

        new_name       = request.data.get("name")
        start_date_str = request.data.get("start_date")
        end_date_str   = request.data.get("end_date")

        if not any([new_name, start_date_str, end_date_str]):
            return Response({"error": "Phải cung cấp ít nhất 1 trường để update"}, status=400)

        if new_name:
            task.name = new_name

        start_date = parse_datetime(start_date_str) if start_date_str else None
        end_date   = parse_datetime(end_date_str)   if end_date_str   else None

        if start_date_str and not start_date:
            return Response({"error": "Định dạng ngày bắt đầu không hợp lệ"}, status=400)
        if end_date_str and not end_date:
            return Response({"error": "Định dạng ngày kết thúc không hợp lệ"}, status=400)

        project = task.project

        # ── Validate start_date mới ─────────────────────────────────────
        if start_date:
            # Không được lùi start_date sớm hơn start_date hiện tại của task
            if task.start_date and start_date < task.start_date:
                return Response(
                    {"error": "Ngày bắt đầu mới không thể sớm hơn ngày bắt đầu hiện tại của task"},
                    status=400,
                )
            # Phải nằm trong khoảng thời gian của project
            if project.start_date and start_date < project.start_date:
                return Response(
                    {"error": "Ngày bắt đầu của task phải sau ngày bắt đầu của dự án"},
                    status=400,
                )
            if project.end_date and start_date > project.end_date:
                return Response(
                    {"error": "Ngày bắt đầu của task phải trước ngày kết thúc của dự án"},
                    status=400,
                )
            # So với end_date hiện tại (nếu end_date không được update cùng lúc)
            effective_end = end_date or task.end_date
            if effective_end and start_date >= effective_end:
                return Response({"error": "Ngày bắt đầu mới không thể >= ngày kết thúc"}, status=400)

        # ── Validate end_date mới ───────────────────────────────────────
        if end_date:
            # Không được rút ngắn end_date sớm hơn end_date hiện tại của task
            if task.end_date and end_date < task.end_date:
                return Response(
                    {"error": "Ngày kết thúc mới không thể sớm hơn ngày kết thúc hiện tại của task"},
                    status=400,
                )
            # Phải nằm trong khoảng thời gian của project
            if project.end_date and end_date > project.end_date:
                return Response(
                    {"error": "Ngày kết thúc của task phải trước ngày kết thúc của dự án"},
                    status=400,
                )
            if project.start_date and end_date < project.start_date:
                return Response(
                    {"error": "Ngày kết thúc của task phải sau ngày bắt đầu của dự án"},
                    status=400,
                )
            # So với start_date hiện tại (nếu start_date không được update cùng lúc)
            effective_start = start_date or task.start_date
            if effective_start and end_date <= effective_start:
                return Response({"error": "Ngày kết thúc mới phải > ngày bắt đầu"}, status=400)

        if start_date:
            task.start_date = start_date
        if end_date:
            task.end_date = end_date

        task.save()

        return Response({"message": "Task đã được cập nhật"}, status=200)


# class UpdateTaskView(APIView):
#     permission_classes = [IsAuthenticated]

#     def patch(self, request, task_uuid):
#         try:
#             task = Task.objects.select_related("project__group").get(uuid=task_uuid)
#         except Task.DoesNotExist:
#             return Response({"error": "Task không tồn tại"}, status=404)

#         if task.project.group.leader != request.user:
#             return Response({"error": "Chỉ Leader mới có quyền cập nhật task"}, status=403)

#         new_name       = request.data.get("name")
#         start_date_str = request.data.get("start_date")
#         end_date_str   = request.data.get("end_date")

#         if not any([new_name, start_date_str, end_date_str]):
#             return Response({"error": "Phải cung cấp ít nhất 1 trường để update"}, status=400)

#         if new_name:
#             task.name = new_name

#         start_date = parse_datetime(start_date_str) if start_date_str else None
#         end_date   = parse_datetime(end_date_str)   if end_date_str   else None

#         if start_date_str and not start_date:
#             return Response({"error": "Định dạng ngày bắt đầu không hợp lệ"}, status=400)
#         if end_date_str and not end_date:
#             return Response({"error": "Định dạng ngày kết thúc không hợp lệ"}, status=400)

#         if start_date:
#             if task.end_date and start_date >= task.end_date:
#                 return Response({"error": "Ngày bắt đầu mới không thể >= ngày kết thúc"}, status=400)
#             task.start_date = start_date

#         if end_date:
#             if task.start_date and end_date <= task.start_date:
#                 return Response({"error": "Ngày kết thúc mới phải > ngày bắt đầu"}, status=400)
#             task.end_date = end_date

#         task.save()

#         return Response({"message": "Task đã được cập nhật"}, status=200)


# ─────────────────────────────────────────────────────────────────────────────
# Update task PROGRESS — member action (triggers status recalc)
# ─────────────────────────────────────────────────────────────────────────────
from apps.tasks.task_service import (
    TaskActivityService
)
class UpdateTaskProgressView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, task_uuid):

        try:
            task = Task.objects.select_related(
                "project__group",
                "assigned_to__group_member__user"
            ).get(uuid=task_uuid)

        except Task.DoesNotExist:
            return Response({"detail": "Task không tồn tại"}, status=404)

        if (
            not task.assigned_to
            or task.assigned_to.group_member.user != request.user
        ):
            return Response({"detail": "Bạn không được assigned task này"}, status=403)

        serializer = UpdateTaskProgressSerializer(
            data=request.data,
            context={"task": task},
        )
        serializer.is_valid(raise_exception=True)

        old_progress = task.progress
        new_progress = serializer.validated_data["progress"]

        task.progress = new_progress
        task.save()

        TaskActivityService.create_activity(
            task=task,
            user=request.user,
            action=f"Cập nhật tiến trình ({task.progress}%)",
            old_value=str(old_progress),
            new_value=str(task.progress),
        )

        # Notify leader khi member nộp bài chờ duyệt
        if new_progress == 100 and old_progress < 100:
            leader      = task.project.group.leader
            member_name = _leader_name(request.user)

            create_notification_and_broadcast(
                user=leader,
                content=(
                    f"{member_name} | {task.project.group.name} | "
                    f"{member_name} đã hoàn thành công việc '{task.name}', đang chờ duyệt"
                ),
                group_name=f"user_{leader.id}",
                priority=2,
            )

        broadcast_task_progress(task.uuid, task.progress, task.computed_status)
        progress = update_project_progress(task.project)
        broadcast_project_progress(task.project.uuid, progress)

        return Response({
            "message": (
                "Task đã được gửi chờ duyệt"
                if new_progress == 100
                else "Tiến độ đã được cập nhật"
            ),
            "task_uuid": str(task.uuid),
            "progress": task.progress,
            "status": task.computed_status,
            "is_approved": task.is_approved,
            "project_progress": progress,
        })

# ─────────────────────────────────────────────────────────────────────────────
# Approve task — leader action
# ─────────────────────────────────────────────────────────────────────────────

class ApproveTaskView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, task_uuid):
        try:
            task = Task.objects.select_related(
                "project__group", "assigned_to__group_member__user"
            ).get(uuid=task_uuid)
        except Task.DoesNotExist:
            return Response({"error": "Task not found"}, status=404)

        if task.project.group.leader != request.user:
            return Response({"error": "Chỉ Leader mới có thể approve task"}, status=403)

        if task.progress != 100:
            return Response({"error": "Task chưa đạt 100% tiến độ"}, status=400)

        serializer = ApproveTaskSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        approved = serializer.validated_data["approved"]
        task.is_approved = approved

        if not approved:
            task.progress    = 0
            task.is_approved = False

        task.save()

        if task.assigned_to:
            member_user = task.assigned_to.group_member.user
            leader_name = _leader_name(request.user)
            if approved:
                msg      = f"{leader_name} | {task.project.group.name} | Task '{task.name}' của bạn đã được duyệt ✓"
                priority = 2
            else:
                msg      = f"{leader_name} | {task.project.group.name} | Task '{task.name}' bị từ chối, vui lòng làm lại"
                priority = 3

            create_notification_and_broadcast(
                user=member_user,
                content=msg,
                group_name=f"user_{member_user.id}",
                priority=priority,
            )

        TaskActivity.objects.create(
            task      = task,
            user      = request.user,
            action    = "approved",
            old_value = None,
            new_value = "approved" if approved else "rejected",
        )

        broadcast_task_progress(task.uuid, task.progress, task.computed_status)
        progress = update_project_progress(task.project)
        broadcast_project_progress(task.project.uuid, progress)

        return Response({
            "message"          : "Đã duyệt task" if approved else "Đã từ chối task",
            "task_uuid"        : str(task.uuid),
            "is_approved"      : task.is_approved,
            "status"           : task.computed_status,
            "project_progress" : progress,
        }, status=200)

# ─────────────────────────────────────────────────────────────────────────────
# Remind task (leader sends notification to assigned member)
# ─────────────────────────────────────────────────────────────────────────────

class RemindTaskView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, task_uuid):
        try:
            task = Task.objects.select_related(
                "project__group", "assigned_to__group_member__user"
            ).get(uuid=task_uuid)
        except Task.DoesNotExist:
            return Response({"error": "Task not found"}, status=404)

        if task.project.group.leader != request.user:
            return Response({"error": "Chỉ Leader mới có thể gửi nhắc nhở"}, status=403)

        if not task.assigned_to:
            return Response({"error": "Task chưa được giao cho ai"}, status=400)

        leader_name = _leader_name(request.user)
        member_user = task.assigned_to.group_member.user
        custom_msg  = request.data.get("message", "")
        content     = (
            f"{leader_name} | {task.project.group.name} | "
            f"Nhắc nhở: '{task.name}' – {custom_msg or 'Hãy cập nhật tiến độ công việc!'}"
        )

        create_notification_and_broadcast(
            user=member_user,
            content=content,
            group_name=f"user_{member_user.id}",
            priority=2,
        )

        task.is_warned = True
        task.save(update_fields=["is_warned"])

        return Response({"message": "Đã gửi nhắc nhở"}, status=200)


# ─────────────────────────────────────────────────────────────────────────────
# My task list
# ─────────────────────────────────────────────────────────────────────────────

class MyTaskListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tasks = Task.objects.select_related(
            "project", "project__group", "assigned_to__group_member__user"
        ).filter(
            assigned_to__group_member__user=request.user
        ).order_by("created_at")

        serializer = UserTaskListSerializer(tasks, many=True)
        return Response({"count": tasks.count(), "tasks": serializer.data}, status=200)


# ─────────────────────────────────────────────────────────────────────────────
# Warning tasks
# ─────────────────────────────────────────────────────────────────────────────

class WarningTaskView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        base_qs = Task.objects.select_related(
            "project", "project__group",
            "assigned_to__group_member__user__profile",
        )

        personal_tasks = base_qs.filter(assigned_to__group_member__user=user)
        leader_tasks   = base_qs.filter(project__group__leader=user)

        result = []
        seen   = set()

        for task in personal_tasks:
            reason = WarningTaskSerializer.get_warning_reason(task)
            if task.uuid not in seen and reason:
                task.type         = "personal"
                task.warning_note = reason
                result.append(task)
                seen.add(task.uuid)

        for task in leader_tasks:
            reason = WarningTaskSerializer.get_warning_reason(task)
            if task.uuid not in seen and reason:
                task.type         = "leader"
                task.warning_note = reason
                result.append(task)
                seen.add(task.uuid)

        serializer = WarningTaskSerializer(result, many=True, context={"request": request})
        return Response({"count": len(result), "tasks": serializer.data})
