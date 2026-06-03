# apps/comments/models.py
"""
Add `is_pinned` field to the existing Comment model.
Run:  python manage.py makemigrations comments && python manage.py migrate
"""

from django.db import models
from django.contrib.auth.models import User
from apps.projects.models import Project
from apps.tasks.models import Task
import uuid


class Comment(models.Model):
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)

    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="comments"
    )
    task = models.ForeignKey(
        Task, on_delete=models.CASCADE,
        related_name="comments", null=True, blank=True,
    )
    user   = models.ForeignKey(User, on_delete=models.CASCADE)
    parent = models.ForeignKey(
        "self", on_delete=models.CASCADE,
        null=True, blank=True, related_name="replies",
    )

    content    = models.TextField()
    is_edited  = models.BooleanField(default=False)
    is_pinned  = models.BooleanField(default=False)          # ← NEW

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-is_pinned", "-created_at"]