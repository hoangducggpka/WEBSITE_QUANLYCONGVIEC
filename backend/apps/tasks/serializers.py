# apps/tasks/serializers.py
from rest_framework import serializers
from django.utils import timezone
from apps.projects.models import UserProject
from .models import Task, TaskActivity

class TaskActivitySerializer(serializers.ModelSerializer):

    user       = serializers.SerializerMethodField()
    task       = serializers.SerializerMethodField()
    project    = serializers.SerializerMethodField()
    created_at = serializers.SerializerMethodField()

    class Meta:
        model  = TaskActivity
        fields = [
            "id",
            "action",
            "old_value",
            "new_value",
            "created_at",
            "user",
            "task",
            "project",
        ]

    # ── FIX: chỉ 1 get_created_at, luôn trả về ISO string ──────────────
    def get_created_at(self, obj):
        return timezone.localtime(obj.created_at).isoformat()

    def get_user(self, obj):
        request = self.context.get("request")
        profile = getattr(obj.user, "profile", None)

        avatar = None
        if profile and profile.avatarpath:
            avatar = (
                request.build_absolute_uri(profile.avatarpath.url)
                if request
                else profile.avatarpath.url
            )

        return {
            "id":       obj.user.id,
            "username": obj.user.username,
            "fullname": getattr(profile, "fullname", obj.user.username) or obj.user.username,
            "avatar":   avatar,
        }

    def get_task(self, obj):
        return {
            "uuid":     str(obj.task.uuid),
            "name":     obj.task.name,
            "progress": obj.task.progress,
            "status":   obj.task.computed_status,
        }

    def get_project(self, obj):
        return {
            "uuid": str(obj.task.project.uuid),
            "name": obj.task.project.name,
        }


# ─────────────────────────────────────────────────────────────────────────────
# (Các serializer khác giữ nguyên — copy từ file gốc của bạn)
# ─────────────────────────────────────────────────────────────────────────────

class AssignedUserSerializer(serializers.Serializer):
    userproject_uuid = serializers.UUIDField(source="uuid")
    userprofile_uuid = serializers.UUIDField(source="group_member.user.profile.uuid")
    username         = serializers.CharField(source="group_member.user.username")
    fullname         = serializers.CharField(source="group_member.user.profile.fullname")
    user_code        = serializers.CharField(source="group_member.user.profile.user_code")
    avatarpath       = serializers.SerializerMethodField()

    def get_avatarpath(self, obj):
        request = self.context.get("request")
        path = obj.group_member.user.profile.avatarpath
        if path and request:
            return request.build_absolute_uri(path.url)
        return None


class TaskItemSerializer(serializers.Serializer):
    name        = serializers.CharField(max_length=50)
    start_date  = serializers.DateTimeField()
    end_date    = serializers.DateTimeField()
    assigned_to = serializers.UUIDField(required=False)
    difficulty  = serializers.IntegerField(required=True)

    def validate(self, data):
        project       = self.context["project"]
        assigned_uuid = data.get("assigned_to")
        start = data.get("start_date")
        end   = data.get("end_date")

        if start and end and start >= end:
            raise serializers.ValidationError("Ngày kết thúc phải lớn hơn Ngày bắt đầu!")
        if project.start_date and start < project.start_date:
            raise serializers.ValidationError("Ngày bắt đầu của công việc phải sau Ngày bắt đầu của dự án!")
        if project.end_date and end > project.end_date:
            raise serializers.ValidationError("Ngày kết thúc của công việc phải trước ngày kết thúc của dự án!")

        if assigned_uuid:
            try:
                up = UserProject.objects.get(uuid=assigned_uuid, project=project)
            except UserProject.DoesNotExist:
                raise serializers.ValidationError("Người dùng không phải thành viên của dự án!")
            data["assigned_to"] = up

        return data


class BulkTaskCreateSerializer(serializers.Serializer):
    tasks = TaskItemSerializer(many=True)

    def validate(self, data):
        for task in data.get("tasks", []):
            if task["start_date"] >= task["end_date"]:
                raise serializers.ValidationError(
                    f"Task '{task['name']}' has invalid time range"
                )
        return data

    def create(self, validated_data):
        project    = self.context["project"]
        tasks_data = validated_data["tasks"]
        tasks = [
            Task(
                project     = project,
                name        = item["name"],
                start_date  = item["start_date"],
                end_date    = item["end_date"],
                assigned_to = item.get("assigned_to"),
                difficulty  = item["difficulty"],
            )
            for item in tasks_data
        ]
        return Task.objects.bulk_create(tasks)


class UpdateTaskProgressSerializer(serializers.Serializer):
    progress = serializers.IntegerField(min_value=0, max_value=100)

    default_error_messages = {
        "already_done":       "Task đã được approve, không thể cập nhật",
        "project_not_started":"Dự án chưa bắt đầu",
        "project_finished":   "Dự án đã kết thúc",
        "task_overdue":       "Task đã quá thời hạn, không thể cập nhật",
        "cannot_decrease":    "Không thể giảm tiến độ task",
    }

    def validate(self, attrs):
        task     = self.context["task"]
        now      = timezone.localtime()
        progress = attrs["progress"]

        if task.is_approved:
            self.fail("already_done")

        proj_status = task.project.computed_status
        if proj_status == "preparing":
            self.fail("project_not_started")
        if proj_status == "finished":
            self.fail("project_finished")

        if task.end_date and timezone.localtime(task.end_date) < now:
            self.fail("task_overdue")

        if progress < task.progress:
            self.fail("cannot_decrease")

        return attrs


# class ApproveTaskSerializer(serializers.Serializer):
#     approved = serializers.BooleanField()


class UpdateTaskStatusSerializer(serializers.Serializer):
    status  = serializers.ChoiceField(choices=["todo", "inprogress", "stuck", "done"])
    confirm = serializers.BooleanField(required=False)

    def validate(self, data):
        task           = self.context["task"]
        new_status     = data["status"]
        current_status = task.status

        if current_status == "done":
            raise serializers.ValidationError("Task already completed")
        if new_status == "done" and not data.get("confirm"):
            raise serializers.ValidationError("Confirmation required to mark as done")
        if current_status == "todo" and new_status == "done":
            raise serializers.ValidationError("Cannot move directly from todo to done")
        if current_status == "stuck" and new_status == "done":
            raise serializers.ValidationError("Must move back to inprogress before done")

        return data


class UserTaskListSerializer(serializers.ModelSerializer):
    project_uuid = serializers.UUIDField(source="project.uuid")
    project_name = serializers.CharField(source="project.name")
    group_name   = serializers.CharField(source="project.group.name")
    # status       = serializers.CharField(source="task.sta", read_only=True)

    class Meta:
        model  = Task
        fields = [
            "uuid", "name", "project_uuid", "project_name", "group_name",
            "start_date", "end_date", "status", "progress", "note",
            "created_at", "is_approved",
        ]


class WarningTaskSerializer(serializers.ModelSerializer):
    task_name    = serializers.CharField(source="name")
    project_uuid = serializers.UUIDField(source="project.uuid")
    project_name = serializers.CharField(source="project.name")
    assigned_to  = AssignedUserSerializer(allow_null=True)
    type         = serializers.CharField()
    warning_note = serializers.CharField()
    status       = serializers.CharField(source="computed_status", read_only=True)

    class Meta:
        model  = Task
        fields = [
            "uuid", "task_name", "project_uuid", "project_name",
            "assigned_to", "status", "progress",
            "start_date", "end_date",
            "type", "warning_note", "is_warned",
        ]

    @staticmethod
    def get_warning_reason(task):
        if not task.start_date or not task.end_date:
            return None

        now   = timezone.localtime(timezone.now())
        start = timezone.localtime(task.start_date)
        end   = timezone.localtime(task.end_date)

        total = (end - start).total_seconds()
        if total <= 0:
            return None

        elapsed         = (now - start).total_seconds()
        remaining_ratio = 1 - (elapsed / total)
        computed        = task.computed_status

        if remaining_ratio <= 0.1 and computed != Task.STATUS_DONE:
            return "Sắp trễ hạn (còn ≤10% thời gian nhưng chưa hoàn thành)"

        if remaining_ratio <= 0.5 and computed == Task.STATUS_TODO:
            return "Chưa bắt đầu khi đã qua 50% thời gian"

        return None

# ─────────────────────────────────────────────────────────────────────────────
# Shared helpers
# ─────────────────────────────────────────────────────────────────────────────

# class AssignedUserSerializer(serializers.Serializer):
#     userproject_uuid  = serializers.UUIDField(source="uuid")
#     userprofile_uuid  = serializers.UUIDField(source="group_member.user.profile.uuid")
#     username          = serializers.CharField(source="group_member.user.username")
#     fullname          = serializers.CharField(source="group_member.user.profile.fullname")
#     user_code         = serializers.CharField(source="group_member.user.profile.user_code")
#     avatarpath        = serializers.SerializerMethodField()

#     def get_avatarpath(self, obj):
#         request = self.context.get("request")
#         path = obj.group_member.user.profile.avatarpath
#         if path and request:
#             return request.build_absolute_uri(path.url)
#         return None


# ─────────────────────────────────────────────────────────────────────────────
# Bulk-create
# ─────────────────────────────────────────────────────────────────────────────

# class TaskItemSerializer(serializers.Serializer):
#     name        = serializers.CharField(max_length=50)
#     start_date  = serializers.DateTimeField()
#     end_date    = serializers.DateTimeField()
#     assigned_to = serializers.UUIDField(required=False)
#     difficulty  = serializers.IntegerField(required=True)

#     def validate(self, data):
#         project      = self.context["project"]
#         assigned_uuid = data.get("assigned_to")
#         start = data.get("start_date")
#         end   = data.get("end_date")

#         if start and end and start >= end:
#             raise serializers.ValidationError("end_date must be greater than start_date")

#         if project.start_date and start < project.start_date:
#             raise serializers.ValidationError("Task start_date must be after project start_date")

#         if project.end_date and end > project.end_date:
#             raise serializers.ValidationError("Task end_date must be before project end_date")

#         if assigned_uuid:
#             try:
#                 up = UserProject.objects.get(uuid=assigned_uuid, project=project)
#             except UserProject.DoesNotExist:
#                 raise serializers.ValidationError("User is not a member of this project")
#             data["assigned_to"] = up

#         return data


# class BulkTaskCreateSerializer(serializers.Serializer):
#     tasks = TaskItemSerializer(many=True)

#     def validate(self, data):
#         for task in data.get("tasks", []):
#             if task["start_date"] >= task["end_date"]:
#                 raise serializers.ValidationError(
#                     f"Task '{task['name']}' has invalid time range"
#                 )
#         return data

#     def create(self, validated_data):
#         project    = self.context["project"]
#         tasks_data = validated_data["tasks"]
#         tasks = [
#             Task(
#                 project     = project,
#                 name        = item["name"],
#                 start_date  = item["start_date"],
#                 end_date    = item["end_date"],
#                 assigned_to = item.get("assigned_to"),
#                 difficulty  = item["difficulty"],
#             )
#             for item in tasks_data
#         ]
#         return Task.objects.bulk_create(tasks)


# ─────────────────────────────────────────────────────────────────────────────
# Update progress (member action)
# ─────────────────────────────────────────────────────────────────────────────

# class UpdateTaskProgressSerializer(serializers.Serializer):
#     progress = serializers.IntegerField(
#         min_value=0,
#         max_value=100
#     )

#     default_error_messages = {
#         "already_done": "Task đã được approve, không thể cập nhật",
#         "project_not_started": "Dự án chưa bắt đầu",
#         "project_finished": "Dự án đã kết thúc",
#         "task_overdue": "Task đã quá thời hạn, không thể cập nhật",
#         "cannot_decrease": "Không thể giảm tiến độ task",
#     }

#     def validate(self, attrs):
#         task = self.context["task"]
#         now = timezone.localtime()

#         progress = attrs["progress"]

#         # Approved
#         if task.is_approved:
#             self.fail("already_done")

#         # Project status
#         proj_status = task.project.computed_status

#         if proj_status == "preparing":
#             self.fail("project_not_started")

#         if proj_status == "finished":
#             self.fail("project_finished")

#         # Deadline
#         if task.end_date and timezone.localtime(task.end_date) < now:
#             self.fail("task_overdue")

#         # Optional business rule
#         if progress < task.progress:
#             self.fail("cannot_decrease")

#         return attrs
# class UpdateTaskProgressSerializer(serializers.Serializer):
#     progress = serializers.IntegerField(min_value=0, max_value=100)

#     def validate(self, data):
#         task = self.context["task"]
#         if task.status == Task.STATUS_DONE:
#             raise serializers.ValidationError("Task already approved as done")
#         return data


# ─────────────────────────────────────────────────────────────────────────────
# Approve task (leader action: sets is_approved=True when progress==100)
# ─────────────────────────────────────────────────────────────────────────────

class ApproveTaskSerializer(serializers.Serializer):
    """Leader approves a task that is in_review (progress=100, is_approved=False)."""
    approved = serializers.BooleanField()


# ─────────────────────────────────────────────────────────────────────────────
# Update task status (legacy – kept for backward compat)
# ─────────────────────────────────────────────────────────────────────────────

# class UpdateTaskStatusSerializer(serializers.Serializer):
#     status  = serializers.ChoiceField(choices=["todo", "inprogress", "stuck", "done"])
#     confirm = serializers.BooleanField(required=False)

#     def validate(self, data):
#         task           = self.context["task"]
#         new_status     = data["status"]
#         current_status = task.status

#         if current_status == "done":
#             raise serializers.ValidationError("Task already completed")
#         if new_status == "done" and not data.get("confirm"):
#             raise serializers.ValidationError("Confirmation required to mark as done")
#         if current_status == "todo" and new_status == "done":
#             raise serializers.ValidationError("Cannot move directly from todo to done")
#         if current_status == "stuck" and new_status == "done":
#             raise serializers.ValidationError("Must move back to inprogress before done")

#         return data


# ─────────────────────────────────────────────────────────────────────────────
# User task list
# ─────────────────────────────────────────────────────────────────────────────

# class UserTaskListSerializer(serializers.ModelSerializer):
#     project_uuid = serializers.UUIDField(source="project.uuid")
#     project_name = serializers.CharField(source="project.name")
#     group_name   = serializers.CharField(source="project.group.name")
#     status       = serializers.CharField(source="computed_status", read_only=True)

#     class Meta:
#         model  = Task
#         fields = [
#             "uuid", "name", "project_uuid", "project_name", "group_name",
#             "start_date", "end_date", "status", "progress", "note", "created_at","is_approved"
#         ]


# ─────────────────────────────────────────────────────────────────────────────
# Warning tasks
# ─────────────────────────────────────────────────────────────────────────────

# class WarningTaskSerializer(serializers.ModelSerializer):
#     task_name    = serializers.CharField(source="name")
#     project_uuid = serializers.UUIDField(source="project.uuid")
#     project_name = serializers.CharField(source="project.name")
#     assigned_to  = AssignedUserSerializer(allow_null=True)
#     type         = serializers.CharField()
#     warning_note = serializers.CharField()
#     status       = serializers.CharField(source="computed_status", read_only=True)

#     class Meta:
#         model  = Task
#         fields = [
#             "uuid", "task_name", "project_uuid", "project_name",
#             "assigned_to", "status", "progress",
#             "start_date", "end_date",
#             "type", "warning_note", "is_warned",
#         ]

#     @staticmethod
#     def get_warning_reason(task):
#         if not task.start_date or not task.end_date:
#             return None

#         now   = timezone.localtime(timezone.now())
#         start = timezone.localtime(task.start_date)
#         end   = timezone.localtime(task.end_date)

#         total   = (end - start).total_seconds()
#         if total <= 0:
#             return None

#         elapsed          = (now - start).total_seconds()
#         remaining_ratio  = 1 - (elapsed / total)

#         computed = task.computed_status

#         # 90% thời gian trôi qua mà chưa done
#         if remaining_ratio <= 0.1 and computed != Task.STATUS_DONE:
#             return "Sắp trễ hạn (còn ≤10% thời gian nhưng chưa hoàn thành)"

#         # 50% thời gian trôi qua mà vẫn todo (chưa bắt đầu)
#         if remaining_ratio <= 0.5 and computed == Task.STATUS_TODO:
#             return "Chưa bắt đầu khi đã qua 50% thời gian"

#         return None

