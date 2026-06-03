# apps/comments/views.py
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.projects.models import Project, UserProject
from .models import Comment
from .serializers import CommentSerializer


def _can_comment(user, project) -> bool:
    """Leader OR project member can comment."""
    if project.group.leader == user:
        return True
    return UserProject.objects.filter(project=project, group_member__user=user).exists()


class ProjectCommentListView(APIView):
    """GET  /comments/<project_uuid>/  – list all top-level comments
       POST /comments/<project_uuid>/  – create comment (or reply)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, project_uuid):
        try:
            project = Project.objects.select_related("group").get(uuid=project_uuid)
        except Project.DoesNotExist:
            return Response({"error": "Project not found"}, status=404)

        if not _can_comment(request.user, project):
            return Response({"error": "Access denied"}, status=403)

        comments = (
            project.comments
            .filter(parent__isnull=True)
            .select_related("user__profile")
            .prefetch_related("replies__user__profile")
            .order_by("-is_pinned", "-created_at")
        )
        serializer = CommentSerializer(comments, many=True, context={"request": request})
        return Response(serializer.data)

    def post(self, request, project_uuid):
        try:
            project = Project.objects.select_related("group").get(uuid=project_uuid)
        except Project.DoesNotExist:
            return Response({"error": "Project not found"}, status=404)

        if not _can_comment(request.user, project):
            return Response({"error": "Access denied"}, status=403)

        content     = request.data.get("content", "").strip()
        parent_uuid = request.data.get("parent_uuid")

        if not content:
            return Response({"error": "Content is required"}, status=400)

        parent = None
        if parent_uuid:
            try:
                parent = Comment.objects.get(uuid=parent_uuid, project=project, parent__isnull=True)
            except Comment.DoesNotExist:
                return Response({"error": "Parent comment not found"}, status=404)

        comment = Comment.objects.create(
            project = project,
            user    = request.user,
            content = content,
            parent  = parent,
        )

        serializer = CommentSerializer(comment, context={"request": request})
        return Response(serializer.data, status=201)


class CommentDetailView(APIView):
    """PATCH  /comments/detail/<uuid>/  – edit own comment
       DELETE /comments/detail/<uuid>/  – delete (owner or leader)
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, comment_uuid):
        try:
            comment = Comment.objects.select_related("project__group").get(uuid=comment_uuid)
        except Comment.DoesNotExist:
            return Response({"error": "Comment not found"}, status=404)

        if comment.user != request.user:
            return Response({"error": "You can only edit your own comments"}, status=403)

        content = request.data.get("content", "").strip()
        if not content:
            return Response({"error": "Content is required"}, status=400)

        comment.content   = content
        comment.is_edited = True
        comment.save()

        return Response(CommentSerializer(comment, context={"request": request}).data)

    def delete(self, request, comment_uuid):
        try:
            comment = Comment.objects.select_related("project__group").get(uuid=comment_uuid)
        except Comment.DoesNotExist:
            return Response({"error": "Comment not found"}, status=404)

        is_owner  = comment.user == request.user
        is_leader = comment.project.group.leader == request.user

        if not (is_owner or is_leader):
            return Response({"error": "Permission denied"}, status=403)

        comment.delete()
        return Response({"message": "Deleted"}, status=200)


class PinCommentView(APIView):
    """POST /comments/pin/<uuid>/  – toggle pin (leader only)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, comment_uuid):
        try:
            comment = Comment.objects.select_related("project__group").get(uuid=comment_uuid)
        except Comment.DoesNotExist:
            return Response({"error": "Comment not found"}, status=404)

        if comment.project.group.leader != request.user:
            return Response({"error": "Only leader can pin comments"}, status=403)

        comment.is_pinned = not comment.is_pinned
        comment.save(update_fields=["is_pinned"])

        return Response({"pinned": comment.is_pinned, "comment_uuid": str(comment.uuid)}, status=200)