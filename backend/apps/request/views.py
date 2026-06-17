from rest_framework import generics, permissions, serializers
from .models import Request
from .serializers import RequestSerializer

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from apps.groups.models import Group, GroupMember
from apps.notifications.models import Notification
from apps.chat.services.chat_service import (get_or_create_group_conversation, add_user_to_group_conversation)
from apps.notifications.notification_service import create_notification_and_broadcast
class RejectRequestView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, request_uuid):
        try:
            req = Request.objects.get(uuid=request_uuid)
        except Request.DoesNotExist:
            return Response({"detail": "Request not found"}, status=status.HTTP_404_NOT_FOUND)

        group = req.group
        user = request.user

        # chỉ leader của group mới được reject
        if group.leader != user:
            raise serializers.ValidationError({"detail": "Bạn không phải leader của nhóm này."})

        # tạo notification cho user của request
        leader_fullname = getattr(user.profile, "fullname", user.username)
        content = f'{leader_fullname} | {group.name} | Yêu cầu vào nhóm "{group.name}" của bạn đã bị từ chối'

        create_notification_and_broadcast(
            user=req.user,
            content=content,
            group_name=f"user_{req.user.id}",
            priority=2,
        )
        # xoá req
        req.delete()

        return Response({"detail": "Request rejected"}, status=status.HTTP_200_OK)

class CreateRequestView(generics.CreateAPIView):
    queryset = Request.objects.all()
    serializer_class = RequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        group_uuid = self.kwargs.get("group_uuid")
        try:
            group = Group.objects.get(uuid=group_uuid)
        except Group.DoesNotExist:
            raise serializers.ValidationError({"group": "Group not found"})

        user = self.request.user
        #check leader
        if group.leader == user:
            raise serializers.ValidationError({"detail": "Bạn là leader của nhóm này."})
        #check member
        if GroupMember.objects.filter(user=user, group=group).exists():
            raise serializers.ValidationError({"detail": "Bạn đã là thành viên của nhóm này."})
        #check duplicate
        if Request.objects.filter(user=user, group=group).exists():
            raise serializers.ValidationError({"detail": "Bạn đã gửi yêu cầu tham gia nhóm này rồi."})

        serializer.save(user=user, group=group)



class LeaderRequestListView(generics.ListAPIView):
    serializer_class = RequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    

    def get_queryset(self):
        group_uuid = self.kwargs.get("group_uuid") 
        return Request.objects.filter(group__uuid=group_uuid, group__leader=self.request.user).order_by("-created_at")
    



class ApproveRequestView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, request_uuid):
        try:
            req = Request.objects.get(uuid=request_uuid)
        except Request.DoesNotExist:
            return Response({"error": "Not found"}, status=404)

        group = req.group

        if group.leader != request.user:
            return Response({"error": "Permission denied"}, status=403)
        
        # req.is_approved = True
        # req.save()

        GroupMember.objects.get_or_create(user=req.user, group=group)

        leader_profile = request.user.profile
        leader_name = leader_profile.fullname
        group_name = group.name

        content = f"{leader_name} | {group_name} | {leader_name} đã duyệt yêu cầu vào nhóm '{group_name}'"
        add_user_to_group_conversation(group, req.user)
        Notification.objects.create(
            user=req.user,
            content=content,
            priority=1
        )
        create_notification_and_broadcast(
            user=req.user,
            content=content,
            group_name=f"user_{req.user.id}",
            priority=2,
        )
        req.delete()

        return Response({"message": "Approved and member added"}, status=200)
