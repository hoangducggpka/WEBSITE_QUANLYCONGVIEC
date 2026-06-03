#views.py app groups
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import Group, GroupMember
from django.db.models import Q
from .serializers import (
    GroupCreateSerializer, LeaderGroupListSerializer,
    AddMemberSerializer, KickMemberSerializer,
    GroupListSerializer, GroupMembersListSerializer,GroupDetailSerializer
)
from apps.notifications.models import Notification

from django.contrib.auth.models import User
from .utils import normalize_text
from django.db.models import Count


class GroupDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, group_uuid):

        try:
            group = (
                Group.objects
                .select_related(
                    "leader__profile"
                )
                .prefetch_related(
                    "members__user__profile",
                    "group__tasks"
                )
                .get(uuid=group_uuid)
            )

        except Group.DoesNotExist:
            return Response(
                {"error": "Group not found"},
                status=404
            )

        serializer = GroupDetailSerializer(
            group,
            context={"request": request}
        )

        return Response(serializer.data)

class CreateGroupView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = GroupCreateSerializer(
            data=request.data,
            context={"request": request}
        )

        if serializer.is_valid():
            group = serializer.save()
            return Response(
                {"group_uuid": group.uuid},
                status=status.HTTP_201_CREATED
            )

        return Response(serializer.errors, status=400)


class DeleteGroupView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, group_uuid):
        try:
            group = Group.objects.get(uuid=group_uuid)
        except Group.DoesNotExist:
            return Response({"error": "Không tìm thấy group!"}, status=404)

        if group.leader != request.user:
            return Response(
                {"error": "Chỉ Leader mới có thể xóa nhóm!"},
                status=403
            )

        group.delete()
        return Response({"message": "Đã xóa nhóm!"}, status=status.HTTP_200_OK)


class AddMemberView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, group_uuid):
        try:
            group = Group.objects.get(uuid=group_uuid)
        except Group.DoesNotExist:
            return Response({"error": "Group not found"}, status=404)

        if group.leader != request.user:
            return Response(
                {"error": "Chỉ Leader mới có thể thêm thành viên!"},
                status=403
            )

        serializer = AddMemberSerializer(
            data=request.data,
            context={"group": group}
        )

        if serializer.is_valid():
            serializer.save()
            leader_profile = request.user.profile
            leader_name    = leader_profile.fullname
            group_name     = group.name
            username       = request.data.get("username")
            user           = User.objects.get(username=username)

            content = (
                f"{leader_name} | {group_name} | "
                f"{leader_name} đã thêm bạn vào nhóm '{group_name}'"
            )
            Notification.objects.bulk_create([
                Notification(user=user, content=content, priority=1)
            ])
            return Response({"message": "Member added"}, status=201)

        return Response(serializer.errors, status=400)


class LeaveGroupView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, group_uuid):
        try:
            group = Group.objects.get(uuid=group_uuid)
        except Group.DoesNotExist:
            return Response({"error": "Group not found"}, status=404)

        if group.leader == request.user:
            return Response(
                {"error": "Leader chỉ có thể xóa nhóm, không thể rời nhóm!"},
                status=403
            )

        membership = GroupMember.objects.filter(group=group, user=request.user).first()

        if not membership:
            return Response(
                {"error": "Bạn không phải thành viên của nhóm này!"},
                status=400
            )

        membership.delete()
        fullname   = request.user.profile.fullname
        group_name = group.name
        content    = f"{group_name} | | {fullname} đã rời khỏi nhóm"
        Notification.objects.bulk_create([
            Notification(user=group.leader, content=content, priority=1)
        ])

        return Response({"message": "Bạn đã rời nhóm"}, status=status.HTTP_200_OK)


class KickMemberView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, group_uuid):
        try:
            group = Group.objects.get(uuid=group_uuid)
        except Group.DoesNotExist:
            return Response({"error": "Group not found"}, status=404)

        if group.leader != request.user:
            return Response(
                {"error": "Chỉ Trưởng nhóm mới có thể Kick thành viên"},
                status=403
            )

        serializer = KickMemberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user_to_kick = serializer.validated_data["user"]

        if user_to_kick == group.leader:
            return Response({"error": "Cannot kick group leader"}, status=400)

        membership = GroupMember.objects.filter(group=group, user=user_to_kick).first()

        if not membership:
            return Response({"error": "User is not a member of this group"}, status=400)

        membership.delete()

        leader_name = request.user.profile.fullname
        group_name  = group.name
        content     = (
            f'{group_name} | {group_name} | '
            f'{leader_name} Đã kick bạn ra khỏi nhóm "{group_name}"'
        )
        Notification.objects.bulk_create([
            Notification(user=user_to_kick, content=content, priority=2)
        ])
        return Response({"message": "Member kicked successfully"}, status=200)


class MyGroupsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        groups = Group.objects.filter(
            Q(leader=user) | Q(members__user=user)
        ).distinct().select_related("leader__profile").prefetch_related(
            "members__user__profile",
            "group"
        )

        serializer = GroupListSerializer(groups, many=True, context={"request": request})
        return Response(serializer.data)


class GroupMembersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, group_uuid):
        try:
            group = Group.objects.select_related(
                "leader__profile"
            ).prefetch_related(
                "members__user__profile"
            ).get(uuid=group_uuid)
        except Group.DoesNotExist:
            return Response({"error": "Group not found"}, status=404)

        if not (
            group.leader == request.user
            or GroupMember.objects.filter(group=group, user=request.user).exists()
        ):
            return Response({"error": "You do not have permission"}, status=403)

        serializer = GroupMembersListSerializer(group, context={"request": request})
        return Response(serializer.data, status=200)


class MyLedGroupsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        groups = (
            Group.objects
            .filter(leader=request.user)
            .select_related("leader__profile")
            .prefetch_related("members__user__profile")
        )

        serializer = LeaderGroupListSerializer(groups, many=True)
        return Response(serializer.data, status=200)


class SearchGroupView(APIView):
    def post(self, request):
        keyword = request.data.get("keyword", "").strip()

        if not keyword:
            return Response([])

        if keyword.startswith("#"):
            # ── UUID first-segment search ──────────────────────────
            prefix = keyword[1:].lower()
            if not prefix:   # nếu chỉ có dấu #
                return Response([])
            all_groups = Group.objects.annotate(member_count=Count("members"))
            results = []
            for g in all_groups:
                first_seg = str(g.uuid).split("-")[0]
                if first_seg == prefix:
                    results.append({
                        "uuid":         g.uuid,
                        "name":         g.name,
                        "member_count": g.member_count + 1,  # +1 for leader
                    })
                    if len(results) >= 10:
                        break
        else:
            # ── Name (normalized) search ───────────────────────────
            keyword_normalized = normalize_text(keyword)
            groups = Group.objects.annotate(
                member_count=Count("members")
            ).filter(
                name_normalized__icontains=keyword_normalized
            )[:10]

            results = [
                {
                    "uuid":         g.uuid,
                    "name":         g.name,
                    "member_count": g.member_count + 1,
                }
                for g in groups
            ]

        return Response(results)

