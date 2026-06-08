#apps/request/models.py
from django.db import models
from django.contrib.auth.models import User
from apps.groups.models import Group
from apps.projects.models import Project
import uuid

class Request(models.Model):
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)

    name = models.CharField(max_length=255, null=True)

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="requests"
    )

    group = models.ForeignKey(
        Group,
        on_delete=models.CASCADE,
        related_name="requests",
        db_index=True
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="requests_project",
        db_index=True,
        null=True
    )

    is_approved = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "group")

    def __str__(self):
        return f"{self.name} - {self.user.username}"
    
