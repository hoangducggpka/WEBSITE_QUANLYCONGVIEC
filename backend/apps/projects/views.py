# apps/projects/views.py
from __future__ import annotations

from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.groups.models import Group
from apps.notifications.models import Notification
from apps.tasks.models import Task
from apps.tasks.utils import update_project_progress, broadcast_project_progress
from apps.accounts.models import UserProfile

from .models import Project, UserProject
from .serializers import (
    AddProjectMemberSerializer,
    ProjectCreateSerializer,
    ProjectDetailSerializer,
    ProjectListSerializer,
)

from django.db.models import Q

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.projects.models import Project, UserProject
from apps.tasks.models import Task

from .serializers import (
    ProjectOverviewSerializer,
    TaskOverviewSerializer
)

from datetime import timedelta

from apps.tasks.models import TaskActivity
from apps.tasks.serializers import TaskActivitySerializer

class OverviewAPIView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        user = request.user
        now = timezone.now()

        # =========================================================
        # PROJECTS USER LÀ LEADER
        # =========================================================

        leader_projects = Project.objects.filter(
            group__leader=user
        )

        total_projects = leader_projects.count()

        # =========================================================
        # TASKS THUỘC CÁC PROJECT NÀY
        # =========================================================

        project_tasks = Task.objects.filter(
            project__in=leader_projects
        )

        total_tasks = project_tasks.count()

        total_done_tasks = project_tasks.filter(
            status=Task.STATUS_DONE
        ).count()

        total_inprogress_tasks = project_tasks.filter(
            status=Task.STATUS_INPROGRESS
        ).count()

        # =========================================================
        # PROJECT SẮP KẾT THÚC (CÒN <=30%)
        # =========================================================

        recent_or_ending_projects = []

        projects_queryset = leader_projects.exclude(
            Q(status="finished") |
            Q(status="preparing")
        )

        for project in projects_queryset:

            total_duration = (
                project.end_date - project.start_date
            ).total_seconds()

            remaining_duration = (
                project.end_date - now
            ).total_seconds()

            if total_duration <= 0:
                continue

            remaining_ratio = remaining_duration / total_duration

            if 0 <= remaining_ratio <= 0.3:
                recent_or_ending_projects.append(project)

        # =========================================================
        # TASK USER ĐƯỢC ASSIGN SẮP HẾT HẠN
        # =========================================================

        user_tasks = Task.objects.select_related(
            "assigned_to",
            "project"
        ).filter(
            assigned_to__group_member__user=user
        ).exclude(
            Q(status=Task.STATUS_OVERDUE) |
            Q(status=Task.STATUS_DONE)
        )

        ending_tasks = []

        for task in user_tasks:

            if not task.start_date or not task.end_date:
                continue

            total_duration = (
                task.end_date - task.start_date
            ).total_seconds()

            remaining_duration = (
                task.end_date - now
            ).total_seconds()

            if total_duration <= 0:
                continue

            remaining_ratio = remaining_duration / total_duration

            if 0 <= remaining_ratio <= 0.3:
                ending_tasks.append(task)
            # =========================================================
            # RECENT ACTIVITIES
            # =========================================================

        one_week_ago = now - timedelta(days=7)

        # activities = TaskActivity.objects.select_related(
        #     "user",
        #     "task",
        #     "task__project",
        # ).filter(
        #     created_at__gte=one_week_ago
        # ).order_by("-created_at")[:20]
        activities = TaskActivity.objects.select_related(
            "user__profile",
            "task__project",
        ).order_by("-created_at")[:20]
        # =========================================================
        # RESPONSE
        # =========================================================

        return Response({
            "total_projects": total_projects,

            "total_tasks": total_tasks,

            "total_done_tasks": total_done_tasks,

            "total_inprogress_tasks": total_inprogress_tasks,

            "ending_projects": ProjectOverviewSerializer(
                recent_or_ending_projects,
                many=True
            ).data,

            "ending_tasks": TaskOverviewSerializer(
                ending_tasks,
                many=True
            ).data,
            "activities": TaskActivitySerializer(
                activities,
                many=True,
                context={"request": request}
            ).data
        })
def _leader_name(user) -> str:
    profile = getattr(user, "profile", None)
    return profile.fullname if profile and profile.fullname else user.username


# ─────────────────────────────────────────────────────────────────────────────
# Project CRUD
# ─────────────────────────────────────────────────────────────────────────────

class CreateProjectView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, group_uuid):
        try:
            group = Group.objects.get(uuid=group_uuid)
        except Group.DoesNotExist:
            return Response({"error": "Không thể tìm thấy nhóm!"}, status=404)

        if group.leader != request.user:
            return Response({"error": "Chỉ trưởng nhóm mới có thể tạo dự án!"}, status=403)

        serializer = ProjectCreateSerializer(data=request.data, context={"group": group})
        serializer.is_valid(raise_exception=True)
        project = serializer.save()

        return Response({"project_uuid": str(project.uuid)}, status=201)


class UpdateProjectView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, project_uuid):
        try:
            project = Project.objects.select_related("group").get(uuid=project_uuid)
        except Project.DoesNotExist:
            return Response({"error": "Project not found"}, status=404)

        if project.group.leader != request.user:
            return Response({"error": "Only leader can update project"}, status=403)

        serializer = ProjectCreateSerializer(
            project, data=request.data, partial=True,
            context={"group": project.group},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "Project updated successfully"}, status=200)


class DeleteProjectView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        project_uuids = request.data.get("project_uuids", [])
        if not project_uuids:
            return Response({"error": "No project UUIDs provided"}, status=400)

        projects = Project.objects.select_related("group").filter(uuid__in=project_uuids)
        if not projects.exists():
            return Response({"error": "Projects not found"}, status=404)

        if projects.filter(group__leader=request.user).count() != projects.count():
            return Response({"error": "Only leader can delete projects"}, status=403)

        notifications = []
        for project in projects:
            user_projects = UserProject.objects.filter(project=project).select_related("group_member__user")
            leader_name   = _leader_name(project.group.leader)
            for up in user_projects:
                notifications.append(
                    Notification(
                        user    = up.group_member.user,
                        project = None,
                        content = f"{leader_name}||Dự án '{project.name}' đã bị xóa",
                        priority = 3,
                    )
                )

        Notification.objects.bulk_create(notifications)
        deleted_count = projects.count()
        projects.delete()
        return Response({"message": f"Đã xóa {deleted_count} dự án"}, status=200)


class MyProjectsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        leader_projects = Project.objects.filter(group__leader=request.user)
        member_projects = Project.objects.filter(members__group_member__user=request.user)

        projects = (leader_projects | member_projects).select_related(
            "group", "group__leader", "group__leader__profile",
        ).prefetch_related(
            "members__group_member__user__profile"
        ).distinct()

        serializer = ProjectListSerializer(projects, many=True, context={"request": request})
        return Response(serializer.data)


class ProjectDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, project_uuid):
        try:
            project = Project.objects.select_related(
                "group", "group__leader", "group__leader__profile",
            ).prefetch_related(
                "members__group_member__user__profile",
                "members__group_member__user__user_skills__skill",
                "group__members__user__profile",
                "group__members__user__user_skills__skill", 
                "tasks__assigned_to__group_member__user__profile",
            ).get(uuid=project_uuid)
        except Project.DoesNotExist:
            return Response({"error": "Project not found"}, status=404)

        # Access check: must be leader or project member
        is_leader = project.group.leader == request.user
        is_member = project.members.filter(
            group_member__user=request.user
        ).exists()

        if not (is_leader or is_member):
            return Response({"error": "Access denied"}, status=403)

        serializer = ProjectDetailSerializer(project, context={"request": request})
        return Response(serializer.data)


# ─────────────────────────────────────────────────────────────────────────────
# Project name / dates
# ─────────────────────────────────────────────────────────────────────────────

class UpdateProjectNameView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, project_uuid):
        try:
            project = Project.objects.get(uuid=project_uuid)
        except Project.DoesNotExist:
            return Response({"error": "Project not found"}, status=404)

        if project.group.leader != request.user:
            return Response({"error": "Permission denied"}, status=403)

        new_name = request.data.get("name")
        if not new_name:
            return Response({"error": "Name is required"}, status=400)

        project.name = new_name
        project.save()
        return Response({"message": "Project name updated"}, status=200)


class UpdateProjectDatesView(APIView):
    permission_classes = [IsAuthenticated]

    @staticmethod
    def _parse(dt_str):
        if not dt_str:
            return None
        dt = parse_datetime(dt_str)
        if not dt:
            return None
        if timezone.is_naive(dt):
            dt = timezone.make_aware(dt)
        return dt

    def patch(self, request, project_uuid):
        try:
            project = Project.objects.get(uuid=project_uuid)
        except Project.DoesNotExist:
            return Response({"error": "Không tìm thấy dự án!"}, status=404)

        if project.group.leader != request.user:
            return Response({"error": "Chỉ Leader mới có thể thay đổi thời gian dự án"}, status=403)

        start_str = request.data.get("start_date")
        end_str   = request.data.get("end_date")

        if not start_str and not end_str:
            return Response({"error": "Cần cung cấp ít nhất start_date hoặc end_date"}, status=400)

        if start_str and project.computed_status == "ongoing":
            return Response({"error": "Không thể thay đổi start_date khi dự án đang diễn ra!"}, status=400)

        start_date = self._parse(start_str) or project.start_date
        end_date   = self._parse(end_str)   or project.end_date

        if not self._parse(start_str) and start_str:
            return Response({"error": "Định dạng start_date không hợp lệ"}, status=400)
        if not self._parse(end_str) and end_str:
            return Response({"error": "Định dạng end_date không hợp lệ"}, status=400)

        if end_str and end_date <= project.end_date:
            return Response({"error": "Thời gian kết thúc mới phải lớn hơn thời gian kết thúc cũ!"}, status=400)

        if start_str and Task.objects.filter(project=project, start_date__lt=start_date).exists():
            return Response({"error": "Có công việc bắt đầu trước thời gian bắt đầu mới!"}, status=400)

        project.start_date = start_date
        project.end_date   = end_date

        try:
            project.clean()
        except Exception as e:
            return Response({"error": str(e)}, status=400)

        project.save()

        leader_name = _leader_name(request.user)
        Notification.objects.create(
            content    = f"{leader_name} |  | {leader_name} đã thay đổi thời gian dự án '{project.name}'",
            priority   = 2,
            project    = project,
            is_private = False,
        )

        return Response({"message": "Thời gian dự án đã được update!"}, status=200)


# ─────────────────────────────────────────────────────────────────────────────
# Members
# ─────────────────────────────────────────────────────────────────────────────

class AddProjectMemberView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, project_uuid):
        try:
            project = Project.objects.select_related("group").get(uuid=project_uuid)
        except Project.DoesNotExist:
            return Response({"error": "Project not found"}, status=404)

        if project.group.leader != request.user:
            return Response({"error": "Only leader can add project members"}, status=403)

        serializer = AddProjectMemberSerializer(
            data    = request.data,
            context = {"group": project.group, "project": project},
        )
        serializer.is_valid(raise_exception=True)

        up = UserProject.objects.create(
            project      = project,
            group_member = serializer.validated_data["group_member"],
        )

        # Notify new member
        added_user  = serializer.validated_data["group_member"].user
        leader_name = _leader_name(request.user)
        Notification.objects.create(
            user    = added_user,
            content = f"{leader_name} | {project.group.name} | Bạn đã được thêm vào dự án '{project.name}'",
            project = project,
            priority = 2,
        )

        return Response(
            {"message": "Member added to project", "userproject_uuid": str(up.uuid)},
            status=201,
        )


class KickProjectMemberView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, userproject_uuid):
        try:
            up = UserProject.objects.select_related(
                "project__group", "group_member__user"
            ).get(uuid=userproject_uuid)
        except UserProject.DoesNotExist:
            return Response({"error": "UserProject not found"}, status=404)

        project     = up.project
        leader      = project.group.leader
        kicked_user = up.group_member.user

        if leader != request.user:
            return Response({"error": "Chỉ leader mới có thể kick thành viên!"}, status=403)

        if kicked_user == leader:
            return Response({"error": "Bạn không thể tự kick bạn!"}, status=400)

        # Delete all tasks assigned to this user in the project
        Task.objects.filter(project=project, assigned_to=up).delete()

        leader_name = _leader_name(leader)
        Notification.objects.create(
            user    = kicked_user,
            content = f'{leader_name}|{project.group.name}| {leader_name} đã xóa bạn ra khỏi dự án "{project.name}"',
            project = project,
            priority = 4,
        )

        up.delete()

        # Update progress after member tasks removed
        progress = update_project_progress(project)
        broadcast_project_progress(project.uuid, progress)

        return Response({"message": "Đã xóa thành viên ra khỏi dự án!"}, status=200)
