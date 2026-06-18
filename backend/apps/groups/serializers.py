#serializers.py app groups
from rest_framework import serializers
from .models import GroupMember, Group
from apps.accounts.models import UserProfile

from apps.accounts.models import UserProfile
from apps.projects.models import Project
from django.contrib.auth.models import User
import random
from apps.chat.services.chat_service import (get_or_create_group_conversation, add_user_to_group_conversation)
from apps.request.models import Request

class GroupDetailSerializer(serializers.Serializer):
    group = serializers.SerializerMethodField()
    leader = serializers.SerializerMethodField()
    members = serializers.SerializerMethodField()
    projects = serializers.SerializerMethodField()
    requests = serializers.SerializerMethodField()

    def get_group(self, obj):
        request = self.context["request"]

        return {
            "uuid": obj.uuid,
            "name": obj.name,
            "color": obj.color,
            "is_leader": obj.leader == request.user,

            "description": "",

            "members_count":
                obj.members.count() + 1,

            "projects_count":
                obj.group.count(),

            "tasks_count":
                sum(
                    p.tasks.count()
                    for p in obj.group.all()
                )
        }
    
    def get_leader(self, obj):
        leader = obj.leader

        return {
            "user_id": leader.id,
            "fullname": leader.profile.fullname,
            "username": leader.username,
            "user_code": leader.profile.user_code, 
            "avatarpath":
                self.context["request"]
                .build_absolute_uri(
                    leader.profile.avatarpath.url
                )
                if leader.profile.avatarpath else None,

            "online": False
        }
    
    def get_members(self, obj):

        return [
            {
                "user_id": member.user.id,
                "fullname": member.user.profile.fullname,
                "username": member.user.username,
                "user_code": member.user.profile.user_code,
                "avatarpath":
                    self.context["request"]
                    .build_absolute_uri(
                        member.user.profile.avatarpath.url
                    )
                    if member.user.profile.avatarpath else None,

                "online": False
            }
            for member in obj.members.all()
        ]
        
    def get_projects(self, obj):

        return [
            {
                "uuid": p.uuid,
                "name": p.name,
                "status": p.computed_status,
                "progress": p.progress,
                "tasks": p.tasks.count()
            }
            for p in obj.group.all()
        ]
    
    def get_requests(self, obj):

        requests = (
            Request.objects
            .filter(
                group=obj,
                is_approved=False
            )
            .select_related(
                "user__profile"
            )
        )

        return [
            {
                "uuid": r.uuid,
                "fullname": r.user.profile.fullname,
                "user_code": r.user.profile.user_code,
                "created_at": r.created_at
            }
            for r in requests
        ]
    


class GroupCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ["uuid", "name"]
        read_only_fields = ["uuid"]

    def create(self, validated_data):
        user = self.context["request"].user
        color_choices = [f"card-color-{i}" for i in range(1, 11)]
        random_color = random.choice(color_choices)

        group = Group.objects.create(
            leader=user,
            color=random_color,
            **validated_data
        )

        get_or_create_group_conversation(group)
        return group


class AddMemberSerializer(serializers.Serializer):
    username = serializers.CharField()

    def validate(self, data):
        username = data.get("username")

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            raise serializers.ValidationError({
                "error": "Không tìm thấy người dùng!"
            })

        group = self.context["group"]

        if user == group.leader:
            raise serializers.ValidationError({
                "error": "Leader đã ở trong nhóm!"
            })

        if GroupMember.objects.filter(group=group, user=user).exists():
            raise serializers.ValidationError({
                "error": "Người dùng đã ở trong nhóm!"
            })

        data["user"] = user
        return data

    def create(self, validated_data):
        group = self.context["group"]
        user = validated_data["user"]

        member = GroupMember.objects.create(
            user=user,
            group=group
        )

        try:
            print("ADDING TO CONVERSATION", group.id, user.id)
            add_user_to_group_conversation(group, user)
            print("SUCCESS")
        except Exception as e:
            print("ERROR adding to conversation:", e)  # ← sẽ thấy lỗi thật sự

        return member

class KickMemberSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()

    def validate(self, data):
        try:
            user = User.objects.get(id=data["user_id"])
        except User.DoesNotExist:
            raise serializers.ValidationError("User not found")

        data["user"] = user
        return data


# ── my-groups ──────────────────────────────────────────────────
class GroupListSerializer(serializers.ModelSerializer):
    group_name = serializers.CharField(source="name")
    leader     = serializers.SerializerMethodField()
    members    = serializers.SerializerMethodField()
    projects   = serializers.SerializerMethodField()
    is_leader  = serializers.SerializerMethodField()

    class Meta:
        model = Group
        fields = [
            "group_name",
            "uuid",
            "leader",
            "members",
            "projects",
            "color",
            "is_leader",
            "created_at",      # ← needed for frontend sort
        ]

    # ── UPDATED: added fullname to leader ──
    def get_leader(self, obj):
        leader  = obj.leader
        request = self.context.get("request")
        avatarpath = None
        fullname   = None

        if hasattr(leader, "profile"):
            if leader.profile.avatarpath:
                avatarpath = request.build_absolute_uri(leader.profile.avatarpath.url)
            fullname = getattr(leader.profile, "fullname", None)

        return {
            "user_id":   leader.id,
            "username":  leader.username,
            "fullname":  fullname,
            "avatarpath": avatarpath,
        }

    def get_is_leader(self, obj):
        request = self.context.get("request")
        return obj.leader == request.user

    def get_members(self, obj):
        members = obj.members.select_related("user__profile")
        request = self.context.get("request")
        data    = []

        for member in members:
            avatarpath = None
            if hasattr(member.user, "profile") and member.user.profile.avatarpath:
                avatarpath = request.build_absolute_uri(member.user.profile.avatarpath.url)
            data.append({
                "user_id":   member.user.id,
                "username":  member.user.username,
                "fullname":  getattr(member.user.profile, "fullname", None),
                "avatarpath": avatarpath,
            })
        return data

    def get_projects(self, obj):
        projects = obj.group.all()
        return [{"project_id": project.uuid} for project in projects]


# ── members → groupdetail ───────────────────────────────────────
class GroupMembersListSerializer(serializers.Serializer):
    leader  = serializers.SerializerMethodField()
    members = serializers.SerializerMethodField()
    group   = serializers.SerializerMethodField()

    def get_group(self, obj):
        request    = self.context.get("request")
        is_leader  = False

        if request and request.user.is_authenticated:
            is_leader = request.user.id == obj.leader_id

        return {
            "uuid":       obj.uuid,
            "group_name": obj.name,
            "is_leader":  is_leader,
        }

    def get_leader(self, obj):
        leader  = obj.leader
        request = self.context.get("request")
        avatarpath = None

        if request and hasattr(leader, "profile") and leader.profile.avatarpath:
            avatarpath = request.build_absolute_uri(leader.profile.avatarpath.url)

        fullname = leader.profile.fullname if hasattr(leader, "profile") else None
        return {
            "user_id":   leader.id,
            "username":  leader.username,
            "fullname":  fullname,
            "avatarpath": avatarpath,
        }

    def get_members(self, obj):
        members = obj.members.select_related("user__profile")
        request = self.context.get("request")
        data    = []

        for member in members:
            avatarpath = None
            if hasattr(member.user, "profile") and member.user.profile.avatarpath:
                avatarpath = request.build_absolute_uri(member.user.profile.avatarpath.url)

            data.append({
                "user_id":   member.user.id,
                "username":  member.user.username,
                "email":     member.user.email,
                "fullname":  member.user.profile.fullname,
                "user_code": member.user.profile.user_code,
                "phone":     member.user.profile.phone,
                "avatarpath": avatarpath,
            })

        return data


class LeaderGroupListSerializer(serializers.ModelSerializer):
    group_name = serializers.CharField(source="name")
    leader     = serializers.SerializerMethodField()
    members    = serializers.SerializerMethodField()

    class Meta:
        model = Group
        fields = ["uuid", "group_name", "leader", "members"]

    def get_leader(self, obj):
        leader = obj.leader
        return {
            "user_id":   leader.id,
            "username":  leader.username,
            "avatarpath": leader.profile.avatarpath if hasattr(leader, "profile") else None,
            "fullname":   leader.profile.fullname   if hasattr(leader, "profile") else None,
        }

    def get_members(self, obj):
        members = obj.members.select_related("user__profile")
        return [
            {
                "user_id":   member.user.id,
                "uuid":      member.user.profile.uuid      if hasattr(member.user, "profile") else None,
                "username":  member.user.username,
                "fullname":  member.user.profile.fullname  if hasattr(member.user, "profile") else None,
                "user_code": member.user.profile.user_code if hasattr(member.user, "profile") else None,
                "avatarpath": member.user.profile.avatarpath if hasattr(member.user, "profile") else None,
            }
            for member in members
        ]

