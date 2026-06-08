#apps/notifications/views.py
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Q
from .models import Notification
from .serializers import NotificationSerializer
from .pagination import NotificationPagination
    
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from .models import Notification
from rest_framework import status

class DeleteAllNotificationsView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        user = request.user

        deleted_count, _ = Notification.objects.filter(user=user, is_private=True, is_read=True).delete()

        return Response(
            {
                "message": f"Đã xóa {deleted_count} thông báo",
            },
            status=status.HTTP_200_OK,
        )

class NotificationUnreadCountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        count = Notification.objects.filter(
            Q(user=user) |
            Q(
                user__isnull=True,
                project__members__group_member__user=user
            ),
            is_read=False
        ).distinct().count()

        return Response({
            "unread": count
        })


class NotificationListView(ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = NotificationPagination

    def get_queryset(self):
        user = self.request.user

        return (
            Notification.objects
            .filter(
                Q(user=user) |  # notification riêng
                Q(
                    user__isnull=True,
                    project__members__group_member__user=user  # user là member project
                )
            )
            .select_related("project")  # tối ưu query
            .distinct()
            .order_by("-created_at")
        )

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()

        stats = queryset.aggregate(
            all=Count("id"),
            read=Count("id", filter=Q(is_read=True)),
            unread=Count("id", filter=Q(is_read=False)),
        )

        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page, many=True)

        return self.get_paginated_response({
            "all": stats["all"],
            "read": stats["read"],
            "unread": stats["unread"],
            "messages": serializer.data
        })


class MarkNotificationReadView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        notification = get_object_or_404(
            Notification,
            pk=pk,
            user=request.user
        )

        if not notification.is_read:
            notification.is_read = True
            notification.save()

        return Response({
            "message": "Notification marked as read"
        })
    

class MarkAllNotificationsReadView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        updated = Notification.objects.filter(
            user=request.user,
            is_read=False
        ).update(is_read=True)

        return Response({
            "message": f"{updated} notifications marked as read"
        })