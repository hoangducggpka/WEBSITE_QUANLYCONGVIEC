from django.urls import path
from .views import (
    NotificationListView,
    MarkNotificationReadView,
    MarkAllNotificationsReadView,
    NotificationUnreadCountView,
    DeleteAllNotificationsView
)

urlpatterns = [
    path("list/", NotificationListView.as_view(), name="notification-list"),
    path("<int:pk>/read/", MarkNotificationReadView.as_view(), name="notification-read"),
    path("read-all/", MarkAllNotificationsReadView.as_view(), name="notification-read-all"),
    path("unread-count/", NotificationUnreadCountView.as_view(), name="notification-unread-count"),
    path("delete-all/", DeleteAllNotificationsView.as_view()),
]