# apps/tasks/serializers.py
from rest_framework import serializers
from django.utils import timezone
from apps.projects.models import UserProject
from .models import Task


# ─────────────────────────────────────────────────────────────────────────────
# Shared helpers
# ─────────────────────────────────────────────────────────────────────────────

class AssignedUserSerializer(serializers.Serializer):
    userproject_uuid  = serializers.UUIDField(source="uuid")
    userprofile_uuid  = serializers.UUIDField(source="group_member.user.profile.uuid")
    username          = serializers.CharField(source="group_member.user.username")
    fullname          = serializers.CharField(source="group_member.user.profile.fullname")
    user_code         = serializers.CharField(source="group_member.user.profile.user_code")
    avatarpath        = serializers.SerializerMethodField()

    def get_avatarpath(self, obj):
        request = self.context.get("request")
        path = obj.group_member.user.profile.avatarpath
        if path and request:
            return request.build_absolute_uri(path.url)
        return None


# ─────────────────────────────────────────────────────────────────────────────
# Bulk-create
# ─────────────────────────────────────────────────────────────────────────────

class TaskItemSerializer(serializers.Serializer):
    name        = serializers.CharField(max_length=50)
    start_date  = serializers.DateTimeField()
    end_date    = serializers.DateTimeField()
    assigned_to = serializers.UUIDField(required=False)
    difficulty  = serializers.IntegerField(required=True)

    def validate(self, data):
        project      = self.context["project"]
        assigned_uuid = data.get("assigned_to")
        start = data.get("start_date")
        end   = data.get("end_date")

        if start and end and start >= end:
            raise serializers.ValidationError("end_date must be greater than start_date")

        if project.start_date and start < project.start_date:
            raise serializers.ValidationError("Task start_date must be after project start_date")

        if project.end_date and end > project.end_date:
            raise serializers.ValidationError("Task end_date must be before project end_date")

        if assigned_uuid:
            try:
                up = UserProject.objects.get(uuid=assigned_uuid, project=project)
            except UserProject.DoesNotExist:
                raise serializers.ValidationError("User is not a member of this project")
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


# ─────────────────────────────────────────────────────────────────────────────
# Update progress (member action)
# ─────────────────────────────────────────────────────────────────────────────

class UpdateTaskProgressSerializer(serializers.Serializer):
    progress = serializers.IntegerField(min_value=0, max_value=100)

    def validate(self, data):
        task = self.context["task"]
        if task.status == Task.STATUS_DONE:
            raise serializers.ValidationError("Task already approved as done")
        return data


# ─────────────────────────────────────────────────────────────────────────────
# Approve task (leader action: sets is_approved=True when progress==100)
# ─────────────────────────────────────────────────────────────────────────────

class ApproveTaskSerializer(serializers.Serializer):
    """Leader approves a task that is in_review (progress=100, is_approved=False)."""
    approved = serializers.BooleanField()


# ─────────────────────────────────────────────────────────────────────────────
# Update task status (legacy – kept for backward compat)
# ─────────────────────────────────────────────────────────────────────────────

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


# ─────────────────────────────────────────────────────────────────────────────
# User task list
# ─────────────────────────────────────────────────────────────────────────────

class UserTaskListSerializer(serializers.ModelSerializer):
    project_uuid = serializers.UUIDField(source="project.uuid")
    project_name = serializers.CharField(source="project.name")
    group_name   = serializers.CharField(source="project.group.name")
    status       = serializers.CharField(source="computed_status", read_only=True)

    class Meta:
        model  = Task
        fields = [
            "uuid", "name", "project_uuid", "project_name", "group_name",
            "start_date", "end_date", "status", "progress", "note", "created_at",
        ]


# ─────────────────────────────────────────────────────────────────────────────
# Warning tasks
# ─────────────────────────────────────────────────────────────────────────────

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

        total   = (end - start).total_seconds()
        if total <= 0:
            return None

        elapsed          = (now - start).total_seconds()
        remaining_ratio  = 1 - (elapsed / total)

        computed = task.computed_status

        # 90% thời gian trôi qua mà chưa done
        if remaining_ratio <= 0.1 and computed != Task.STATUS_DONE:
            return "Sắp trễ hạn (còn ≤10% thời gian nhưng chưa hoàn thành)"

        # 50% thời gian trôi qua mà vẫn todo (chưa bắt đầu)
        if remaining_ratio <= 0.5 and computed == Task.STATUS_TODO:
            return "Chưa bắt đầu khi đã qua 50% thời gian"

        return None

# #apps/tasks/serializers.py
# from rest_framework import serializers
# from apps.projects.models import UserProject
# from .models import Task


# class TaskItemSerializer(serializers.Serializer):
#     name = serializers.CharField(max_length=50)
#     start_date = serializers.DateTimeField()
#     end_date = serializers.DateTimeField()
#     assigned_to = serializers.UUIDField(required=False)
#     difficulty = serializers.IntegerField(required=True) 

#     def validate(self, data):
#         project = self.context["project"]
#         assigned_uuid = data.get("assigned_to")

#         start = data.get("start_date")
#         end = data.get("end_date")

#         # 1. Validate start < end


#         if start and end and start >= end:
#             raise serializers.ValidationError(
#                 "end_date must be greater than start_date"
#             )
        


#         # 2. Validate nằm trong project
#         if project.start_date and start < project.start_date:
#             raise serializers.ValidationError(
#                 "Task start_date must be after project start_date"
#             )

#         if project.end_date and end > project.end_date:
#             raise serializers.ValidationError(
#                 "Task end_date must be before project end_date"
#             )

#         # 3. Validate assigned user
#         if assigned_uuid:
#             try:
#                 user_project = UserProject.objects.get(
#                     uuid=assigned_uuid,
#                     project=project
#                 )
#             except UserProject.DoesNotExist:
#                 raise serializers.ValidationError(
#                     "User is not a member of this project"
#                 )

#             data["assigned_to"] = user_project

#         return data

# class BulkTaskCreateSerializer(serializers.Serializer):
#     tasks = TaskItemSerializer(many=True)

#     def create(self, validated_data):
#         project = self.context["project"]
#         tasks_data = validated_data["tasks"]

#         tasks = []

#         for item in tasks_data:
#             #delta = item["end_date"] - item["start_date"]
#             #estimation_time = int(delta.total_seconds() // 60)

#             tasks.append(
#                 Task(
#                     project=project,
#                     name=item["name"],
#                     start_date=item["start_date"],
#                     end_date=item["end_date"],
#                     assigned_to=item.get("assigned_to"),
#                     difficulty=item["difficulty"],
#                     #estimation_time=estimation_time
#                 )
#             )

#         return Task.objects.bulk_create(tasks)
#     def validate(self, data):
#         tasks = data.get("tasks", [])


#         for task in tasks:

#             if task["start_date"] >= task["end_date"]:
#                 raise serializers.ValidationError(
#                     f"Task '{task['name']}' has invalid time range"
#                 )

#         return data

# class UserTaskListSerializer(serializers.ModelSerializer):
#     project_uuid = serializers.UUIDField(source="project.uuid")
#     project_name = serializers.CharField(source="project.name")
#     group_name = serializers.CharField(source="project.group.name")

#     class Meta:
#         model = Task
#         fields = [
#             "uuid",
#             "name",
#             "project_uuid",
#             "project_name",
#             "group_name",
#             "start_date",
#             "end_date",
#             "status",
#             "note",
#             "created_at",
#         ]

# class UpdateTaskStatusSerializer(serializers.Serializer):
#     status = serializers.ChoiceField(
#         choices=["todo", "inprogress", "stuck", "done"]
#     )
#     confirm = serializers.BooleanField(required=False)

#     def validate(self, data):
#         task = self.context["task"]
#         new_status = data["status"]
#         current_status = task.status

#         if current_status == "done":
#             raise serializers.ValidationError("Task already completed")

#         if new_status == "done" and not data.get("confirm"):
#             raise serializers.ValidationError(
#                 "Confirmation required to mark as done"
#             )

#         if current_status == "todo" and new_status == "done":
#             raise serializers.ValidationError(
#                 "Cannot move directly from todo to done"
#             )

#         if current_status == "stuck" and new_status == "done":
#             raise serializers.ValidationError(
#                 "Must move back to inprogress before done"
#             )

#         return data
    
# #serial cho overviewpage
# class AssignedUserSerializer(serializers.Serializer):
#     userproject_uuid = serializers.UUIDField(source="uuid")
#     userprofile_uuid = serializers.UUIDField(
#         source="group_member.user.profile.uuid"
#     )
#     username = serializers.CharField(
#         source="group_member.user.username"
#     )
#     fullname = serializers.CharField(
#         source="group_member.user.profile.fullname"
#     )
#     user_code = serializers.CharField(
#         source="group_member.user.profile.user_code"
#     )
#     avatarpath = serializers.CharField(
#         source="group_member.user.profile.avatarpath"
#     )


# from django.utils import timezone
# class WarningTaskSerializer(serializers.ModelSerializer):
#     task_name = serializers.CharField(source="name")
#     project_uuid = serializers.UUIDField(source="project.uuid")
#     project_name = serializers.UUIDField(source="project.name")
    
#     assigned_to = AssignedUserSerializer(
#         allow_null=True
#     )

#     type = serializers.CharField()

#     warning_note = serializers.CharField()

#     class Meta:
#         model = Task
#         fields = [
#             "uuid",
#             "task_name",
#             "project_uuid",
#             "project_name",
#             "assigned_to",
#             "status",
#             "start_date",
#             "end_date",
#             "type",
#             "warning_note",
#             "is_warned"
#         ]

#     def get_warning_reason(task):
#         if not task.start_date or not task.end_date:
#             return None

#         now = timezone.now()
#         now_local = timezone.localtime(now)
#         start = timezone.localtime(task.start_date)
#         end = timezone.localtime(task.end_date)

#         total = (end - start).total_seconds()
#         if total <= 0:
#             return None

#         elapsed = (now_local - start).total_seconds()
#         remaining_ratio = 1 - (elapsed / total)

#         if remaining_ratio <= 0.2 and task.status != "done":
#             return "Sắp trễ hạn (còn ≤20% thời gian nhưng chưa hoàn thành)"

#         if remaining_ratio <= 0.5 and task.status == "todo":
#             return "Chưa bắt đầu khi đã qua 50% thời gian"

#         return None