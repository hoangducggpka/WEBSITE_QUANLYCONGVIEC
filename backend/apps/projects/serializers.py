# apps/projects/serializers.py
import random
from datetime import timedelta

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import serializers

from apps.accounts.models import UserProfile
from apps.groups.models import GroupMember
from apps.tasks.models import Task
from .models import Project, UserProject





class ProjectOverviewSerializer(serializers.ModelSerializer):

    start_date = serializers.SerializerMethodField()
    end_date = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = "__all__"

    def get_start_date(self, obj):
        if not obj.start_date:
            return None

        return timezone.localtime(obj.start_date)

    def get_end_date(self, obj):
        if not obj.end_date:
            return None

        return timezone.localtime(obj.end_date)

class TaskOverviewSerializer(serializers.ModelSerializer):

    start_date = serializers.SerializerMethodField()
    end_date = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = "__all__"

    def get_start_date(self, obj):
        if not obj.start_date:
            return None

        return timezone.localtime(obj.start_date)

    def get_end_date(self, obj):
        if not obj.end_date:
            return None

        return timezone.localtime(obj.end_date)

def _build_avatar(request, profile):
    if request and profile and profile.avatarpath:
        return request.build_absolute_uri(profile.avatarpath.url)
    return None


# ─────────────────────────────────────────────────────────────────────────────
# Task detail (used inside ProjectDetailSerializer)
# ─────────────────────────────────────────────────────────────────────────────

class TaskDetailSerializer(serializers.ModelSerializer):
    username         = serializers.SerializerMethodField()
    fullname         = serializers.SerializerMethodField()
    avatarpath       = serializers.SerializerMethodField()
    userproject_uuid = serializers.SerializerMethodField()
    estimation_time  = serializers.SerializerMethodField()
    time_range       = serializers.SerializerMethodField()
    status           = serializers.CharField(source="computed_status", read_only=True)

    class Meta:
        model  = Task
        fields = [
            "uuid", "name", "status", "difficulty", "note",
            "is_helped", "is_approved", "progress",
            "userproject_uuid", "username", "fullname", "avatarpath",
            "estimation_time", "time_range",
            "start_date", "end_date",
        ]

    def get_userproject_uuid(self, obj):
        return str(obj.assigned_to.uuid) if obj.assigned_to else None

    def get_username(self, obj):
        return obj.assigned_to.group_member.user.username if obj.assigned_to else None

    def get_fullname(self, obj):
        if obj.assigned_to:
            return obj.assigned_to.group_member.user.profile.fullname
        return None

    def get_avatarpath(self, obj):
        if obj.assigned_to:
            request = self.context.get("request")
            return _build_avatar(request, obj.assigned_to.group_member.user.profile)
        return None

    def get_estimation_time(self, obj):
        if not (obj.start_date and obj.end_date):
            return None
        delta   = obj.end_date - obj.start_date
        minutes = int(delta.total_seconds() // 60)
        days    = minutes // (60 * 24); minutes %= (60 * 24)
        hours   = minutes // 60;        minutes %= 60
        parts   = []
        if days:    parts.append(f"{days} ngày")
        if hours:   parts.append(f"{hours} giờ")
        if minutes: parts.append(f"{minutes} phút")
        return " ".join(parts)

    def get_time_range(self, obj):
        if not (obj.start_date and obj.end_date):
            return None
        start = timezone.localtime(obj.start_date)
        end   = timezone.localtime(obj.end_date)
        return f"{start.strftime('%I:%M %p - %d/%m/%Y')} → {end.strftime('%I:%M %p - %d/%m/%Y')}"


# ─────────────────────────────────────────────────────────────────────────────
# Project detail (single project page)
# ─────────────────────────────────────────────────────────────────────────────

class ProjectDetailSerializer(serializers.ModelSerializer):
    group_name         = serializers.CharField(source="group.name")
    is_creator         = serializers.SerializerMethodField()
    project_members    = serializers.SerializerMethodField()
    group_members      = serializers.SerializerMethodField()
    tasks              = serializers.SerializerMethodField()
    status             = serializers.CharField(source="computed_status", read_only=True)
    project_time_range = serializers.SerializerMethodField()
    leader             = serializers.SerializerMethodField()

    class Meta:
        model  = Project
        fields = [
            "uuid", "name", "status", "start_date", "end_date",
            "description", "progress", "project_time_range", "color",
            "is_creator", "leader",
            "group_name", "group_members",
            "project_members",
            "tasks",
        ]

    def get_is_creator(self, obj):
        return obj.group.leader == self.context["request"].user

    def get_leader(self, obj):
        leader  = obj.group.leader
        request = self.context.get("request")
        return {
            "user_id"   : leader.id,
            "username"  : leader.username,
            "fullname"  : getattr(getattr(leader, "profile", None), "fullname", leader.username),
            "avatarpath": _build_avatar(request, getattr(leader, "profile", None)),
        }

    def get_project_members(self, obj):
        request = self.context.get("request")
        result  = []
        for up in obj.members.select_related("group_member__user__profile"):
            user    = up.group_member.user
            profile = user.profile
            skills = [
                {"uuid": str(us.skill.uuid), "name": us.skill.name}
                for us in user.user_skills.select_related("skill").all()
            ]
            result.append({
                "userproject_uuid": str(up.uuid),
                "user_id"         : user.id,
                "username"        : user.username,
                "fullname"        : profile.fullname,
                "user_code"       : profile.user_code,
                "avatarpath"      : _build_avatar(request, profile),
                "skills"          : skills,
            })
        return result

    def get_group_members(self, obj):
        request = self.context["request"]
        if obj.group.leader != request.user:
            return []
        result = []
        for m in obj.group.members.select_related("user__profile"):
            user = m.user
            profile = m.user.profile
            skills = [
                {"uuid": str(us.skill.uuid), "name": us.skill.name}
                for us in user.user_skills.select_related("skill").all()
            ]
            result.append({
                "user_id"         : m.user.id,
                "username"        : m.user.username,
                "fullname"        : profile.fullname,
                "avatarpath"      : _build_avatar(request, profile),
                "userprofile_uuid": str(profile.uuid),
                "user_code"       : profile.user_code,
                "skills"          : skills,
            })
        return result

    def get_project_time_range(self, obj):
        start = timezone.localtime(obj.start_date)
        end   = timezone.localtime(obj.end_date)
        return f"{start.strftime('%I:%M %p - %d/%m/%Y')} → {end.strftime('%I:%M %p - %d/%m/%Y')}"

    def get_tasks(self, obj):
        request = self.context.get("request")
        tasks   = obj.tasks.select_related("assigned_to__group_member__user__profile")
        return TaskDetailSerializer(tasks, many=True, context={"request": request}).data


# ─────────────────────────────────────────────────────────────────────────────
# Project list
# ─────────────────────────────────────────────────────────────────────────────

class ProjectListSerializer(serializers.ModelSerializer):
    leader     = serializers.SerializerMethodField()
    group_name = serializers.CharField(source="group.name")
    is_creator = serializers.SerializerMethodField()
    members    = serializers.SerializerMethodField()
    status     = serializers.CharField(source="computed_status", read_only=True)

    class Meta:
        model  = Project
        fields = [
            "uuid", "name", "group_name", "status",
            "start_date", "end_date",
            "leader", "is_creator", "members",
            "color", "progress",
        ]

    def get_leader(self, obj):
        leader  = obj.group.leader
        request = self.context.get("request")
        return {
            "user_id"   : leader.id,
            "username"  : leader.username,
            "avatarpath": _build_avatar(request, getattr(leader, "profile", None)),
        }

    def get_is_creator(self, obj):
        return obj.group.leader == self.context["request"].user

    def get_members(self, obj):
        request = self.context.get("request")
        result  = []
        for up in obj.members.select_related("group_member__user__profile"):
            user    = up.group_member.user
            profile = getattr(user, "profile", None)
            result.append({
                "uuid"      : str(up.uuid),
                "user_id"   : user.id,
                "username"  : user.username,
                "avatarpath": _build_avatar(request, profile),
                "user_code" : getattr(profile, "user_code", None),
            })
        return result


# ─────────────────────────────────────────────────────────────────────────────
# Project create / update
# ─────────────────────────────────────────────────────────────────────────────

class ProjectCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model        = Project
        fields       = ["uuid", "name", "start_date", "end_date", "description", "status"]
        read_only_fields = ["uuid"]

    def validate(self, data):
        now        = timezone.now()
        start_date = data.get("start_date", getattr(self.instance, "start_date", None))
        end_date   = data.get("end_date",   getattr(self.instance, "end_date",   None))

        if start_date and end_date:
            if (end_date - start_date) < timedelta(hours=5):
                raise serializers.ValidationError({"error": "Thời gian dự án phải ít nhất 5 tiếng"})
            if start_date < now:
                raise serializers.ValidationError({"error": "Ngày bắt đầu phải lớn hơn thời điểm hiện tại"})
            if end_date <= start_date:
                raise serializers.ValidationError({"error": "Ngày kết thúc phải sau ngày bắt đầu"})
            if end_date <= now:
                raise serializers.ValidationError({"error": "Ngày kết thúc phải lớn hơn thời điểm hiện tại"})
        return data

    def create(self, validated_data):
        group        = self.context["group"]
        random_color = random.choice([f"card-color-{i}" for i in range(1, 11)])
        return Project.objects.create(group=group, color=random_color, **validated_data)


# ─────────────────────────────────────────────────────────────────────────────
# Add project member
# ─────────────────────────────────────────────────────────────────────────────

class AddProjectMemberSerializer(serializers.Serializer):
    user_uuid = serializers.UUIDField()

    def validate(self, data):
        try:
            profile = UserProfile.objects.get(uuid=data["user_uuid"])
        except UserProfile.DoesNotExist:
            raise serializers.ValidationError("User not found")

        group  = self.context["group"]
        member = GroupMember.objects.filter(group=group, user=profile.user).first()

        if not member:
            raise serializers.ValidationError("User is not a member of this group")

        # Check already in project
        if self.context.get("project"):
            if UserProject.objects.filter(
                project=self.context["project"],
                group_member=member
            ).exists():
                raise serializers.ValidationError("User is already a member of this project")

        data["group_member"] = member
        return data

# ##apps/projects/serializers.py
# from rest_framework import serializers
# from .models import Project, UserProject
# from apps.accounts.models import UserProfile
# from django.contrib.auth.models import User
# from apps.groups.models import GroupMember
# from django.utils import timezone
# from datetime import timedelta
# from apps.tasks.models import Task


# from apps.tasks.models import Task

# class GroupMemberSerializer(serializers.Serializer):

#     user_id = serializers.IntegerField()
#     username = serializers.CharField()
#     fullname = serializers.CharField()
#     avatarpath = serializers.CharField()

# class ProjectDetailSerializer(serializers.ModelSerializer):

#     group_name = serializers.CharField(source="group.name")

#     is_creator = serializers.SerializerMethodField()

#     project_members = serializers.SerializerMethodField()

#     group_members = serializers.SerializerMethodField()

#     tasks = serializers.SerializerMethodField()
#     status = serializers.CharField(source="computed_status", read_only=True)
#     project_time_range = serializers.SerializerMethodField()

#     class Meta:
#         model = Project
#         fields = [
#             "uuid",
#             "name",
#             "status",
#             "start_date",
#             "end_date",
#             "description",
#             "progress",
#             "project_time_range",
#             "color",

#             "is_creator",

#             "group_name",
#             "group_members",

#             "project_members",

#             "tasks"
#         ]

#     def get_is_creator(self, obj):
#         request = self.context["request"]
#         return obj.group.leader == request.user

#     def get_project_members(self, obj):
#         request = self.context.get("request")
#         user_projects = obj.members.select_related(
#             "group_member__user__profile"
#         )

#         result = []

#         for up in user_projects:
#             user = up.group_member.user
#             profile = user.profile
#             avatarpath = None
#             if hasattr(user, "profile") and user.profile.avatarpath:
#                 avatarpath = request.build_absolute_uri(user.profile.avatarpath.url)

#             skills_qs = up.group_member.user.skills.all()
#             skills = [{"uuid": s.uuid, "name": s.name} for s in skills_qs]

#             result.append({
#                 "userproject_uuid": up.uuid,
#                 "user_id": user.id,
#                 "username": user.username,
#                 "fullname": profile.fullname,
#                 "user_code":profile.user_code,
#                 "avatarpath": avatarpath,
#                 "skills":skills
                

#             })

#         return result
    
#     def get_group_members(self, obj):

#         request = self.context["request"]

#         if obj.group.leader != request.user:
#             return []

#         members = obj.group.members.select_related(
#             "user__profile"
#         )

#         result = []

#         for m in members:

#             profile = m.user.profile
#             avatarpath = None
#             if hasattr(m.user, "profile") and m.user.profile.avatarpath:
#                 avatarpath = request.build_absolute_uri(m.user.profile.avatarpath.url)

#             skills_qs = m.user.skills.all()
#             skills = [{"uuid": s.uuid, "name": s.name} for s in skills_qs]

#             result.append({
#                 "user_id": m.user.id,
#                 "username": m.user.username,
#                 "fullname": profile.fullname,
#                 "avatarpath": avatarpath,
#                 "userprofile_uuid": profile.uuid,
#                 "useruser_code": profile.user_code,
#                 "skills":skills
#             })

#         return result
#     def get_project_time_range(self, obj):
#         # Chuyển start_date và end_date sang timezone hiện tại
#         start = timezone.localtime(obj.start_date)
#         end = timezone.localtime(obj.end_date)

#         # Format giờ và ngày
#         start_str = start.strftime("%I:%M %p - %d/%m/%Y")  # 08:30 AM - 09/04/2026
#         end_str = end.strftime("%I:%M %p - %d/%m/%Y")      # 03:30 PM - 09/04/2026

#         return f"{start_str} → {end_str}"

#     def get_tasks(self, obj):
#         request = self.context["request"]
#         tasks = obj.tasks.select_related(
#             "assigned_to__group_member__user__profile"
#         )

#         return TaskDetailSerializer(tasks, many=True,context={"request": request}).data

# class TaskDetailSerializer(serializers.ModelSerializer):

#     username = serializers.SerializerMethodField()
#     fullname = serializers.SerializerMethodField()
#     avatarpath = serializers.SerializerMethodField()
#     userproject_uuid = serializers.SerializerMethodField()

#     estimation_time = serializers.SerializerMethodField()
#     time_range = serializers.SerializerMethodField()

#     class Meta:
#         model = Task
#         fields = [
#             "uuid",
#             "name",
#             "status",
#             "difficulty",
#             "note",
#             "is_helped",

#             "userproject_uuid",
#             "username",
#             "fullname",
#             "avatarpath",

#             "estimation_time",
#             "time_range",
#         ]

#     def get_userproject_uuid(self, obj):
#         if obj.assigned_to:
#             return obj.assigned_to.uuid
#         return None

#     def get_username(self, obj):
#         if obj.assigned_to:
#             return obj.assigned_to.group_member.user.username
#         return None

#     def get_fullname(self, obj):
#         if obj.assigned_to:
#             profile = obj.assigned_to.group_member.user.profile
#             return profile.fullname
#         return None

#     def get_avatarpath(self, obj):
#         if obj.assigned_to:
#             profile = obj.assigned_to.group_member.user.profile
#             request = self.context.get("request")
#             if profile.avatarpath and request:
#                 return request.build_absolute_uri(profile.avatarpath.url)
#         return None

#     def get_estimation_time(self, obj):

#         if obj.start_date and obj.end_date:

#             delta = obj.end_date - obj.start_date
#             minutes = int(delta.total_seconds() // 60)

#             days = minutes // (60 * 24)
#             minutes %= (60 * 24)

#             hours = minutes // 60
#             minutes %= 60

#             parts = []

#             if days:
#                 parts.append(f"{days} ngày")
#             if hours:
#                 parts.append(f"{hours} giờ")
#             if minutes:
#                 parts.append(f"{minutes} phút")

#             return " ".join(parts)

#         return None

#     def get_time_range(self, obj):
#         if obj.start_date and obj.end_date:
#             # Chuyển sang timezone hiện tại
#             start = timezone.localtime(obj.start_date)
#             end = timezone.localtime(obj.end_date)

#             # Format giờ và ngày
#             start_str = start.strftime("%I:%M %p - %d/%m/%Y")
#             end_str = end.strftime("%I:%M %p - %d/%m/%Y")

#             return f"{start_str} → {end_str}"

#         return None

# import random
# class ProjectCreateSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = Project
#         fields = ["uuid", "name", "start_date", "end_date", "status"]
#         read_only_fields = ["uuid"]

#     def validate(self, data):
#         now = timezone.now()

#         start_date = data.get("start_date", getattr(self.instance, "start_date", None))
#         end_date = data.get("end_date", getattr(self.instance, "end_date", None))

#         if start_date and end_date:
#             duration = end_date - start_date

#             if duration < timedelta(hours=5):
#                 raise serializers.ValidationError({

#                     "error":"Thời gian dự án phải ít nhất 5 tiếng"
#                 })
#             if start_date < now:
#                 raise serializers.ValidationError({
#                     "error": "Ngày bắt đầu phải lớn hơn thời điểm hiện tại"
#                 })
#             if end_date <= start_date:
#                 raise serializers.ValidationError({
#                    "error": "Ngày kết thúc phải sau ngày bắt đầu"
#                 })

#             if end_date <= now:
#                 raise serializers.ValidationError(
#                     {

#                     "error":"Ngày kết thúc phải lớn hơn thời điểm hiện tại"
#                     }
#                 )


                
#         return data


#     def create(self, validated_data):
#         color_choices = [f"card-color-{i}" for i in range(1, 11)]
#         random_color = random.choice(color_choices)
#         group = self.context["group"]
#         return Project.objects.create(
#             group=group,
#             color=random_color,
#             **validated_data
#         )

# class AddProjectMemberSerializer(serializers.Serializer):
#     user_uuid = serializers.UUIDField()

#     def validate(self, data):
#         try:
#             profile = UserProfile.objects.get(uuid=data["user_uuid"])
#         except UserProfile.DoesNotExist:
#             raise serializers.ValidationError("User not found")

#         group = self.context["group"]

#         member = GroupMember.objects.filter(
#             group=group,
#             user=profile.user
#         ).first()

#         if not member:
#             raise serializers.ValidationError(
#                 "User is not a member of this group"
#             )

#         data["group_member"] = member
#         return data
    

# class ProjectMemberSerializer(serializers.Serializer):
#     user_id = serializers.IntegerField()
#     avatarpath = serializers.CharField()

# class ProjectListSerializer(serializers.ModelSerializer):
#     leader = serializers.SerializerMethodField()
#     group_name = serializers.CharField(source="group.name")
#     is_creator = serializers.SerializerMethodField()
#     members = serializers.SerializerMethodField()
#     status = serializers.CharField(source="computed_status", read_only=True)

#     class Meta:
#         model = Project
#         fields = [
#             "uuid",
#             "name",
#             "group_name",
#             "status",
#             "start_date",
#             "end_date",
#             "leader",
#             "is_creator",
#             "members",
#             "color",
#             "progress"
#         ]

#     def get_leader(self, obj):
#         leader = obj.group.leader
#         profile = getattr(leader, "profile", None)
#         request = self.context.get("request")
#         avatarpath = None

#         if request and hasattr(leader, "profile") and leader.profile.avatarpath:
#             avatarpath = request.build_absolute_uri(leader.profile.avatarpath.url)
#         return {
#             "user_id": leader.id,
#             "username": leader.username,
#             "avatarpath": avatarpath,
#         }

#     def get_is_creator(self, obj):
#         request = self.context["request"]
#         return obj.group.leader == request.user

#     def get_members(self, obj):
#         user_projects = obj.members.select_related(
#             "group_member__user__profile"
#         )

#         result = []

#         for up in user_projects:
#             user = up.group_member.user
#             profile = getattr(user, "profile", None)
#             request = self.context.get("request")
#             avatarpath = None
#             if hasattr(user, "profile") and user.profile.avatarpath:
#                 avatarpath = request.build_absolute_uri(user.profile.avatarpath.url)

#             result.append({
#                 "uuid": up.uuid,  # ← UUID của UserProject
#                 "user_id": user.id,
#                 "username": user.username,
#                 "avatarpath": avatarpath,
#                 "user_code":profile.user_code
#             })

#         return result