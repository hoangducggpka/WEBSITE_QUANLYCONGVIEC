# apps/comments/urls.py
from django.urls import path
from .views import ProjectCommentListView, CommentDetailView, PinCommentView

urlpatterns = [
    # List + create comments for a project
    path("<uuid:project_uuid>/",          ProjectCommentListView.as_view(), name="project-comments"),

    # Edit / delete individual comment
    path("detail/<uuid:comment_uuid>/",   CommentDetailView.as_view(),     name="comment-detail"),

    # Toggle pin (leader only)
    path("pin/<uuid:comment_uuid>/",      PinCommentView.as_view(),        name="pin-comment"),
]