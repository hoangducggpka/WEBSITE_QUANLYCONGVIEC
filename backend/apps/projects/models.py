#apps/projects/models.py
from django.db import models
from django.contrib.auth.models import User 
from apps.groups.models import Group, GroupMember
from rest_framework.exceptions import ValidationError
from django.core.validators import MinValueValidator, MaxValueValidator

from apps.skills.models import Skill
from django.utils import timezone

import uuid

class Project(models.Model):
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    name = models.CharField(max_length=100, unique=True)

    group = models.ForeignKey(
        Group,
        on_delete=models.CASCADE,
        related_name="group"
    )

    start_date = models.DateTimeField()
    end_date = models.DateTimeField()

    status = models.CharField(
        max_length=15,
        choices=(
            ("preparing", "Preparing"),
            ("ongoing", "Ongoing"),
            ("finished", "Finished"),
        )
    )

    created_at = models.DateTimeField(auto_now_add=True)
    color = models.CharField(max_length=50, null=True)
    progress = models.PositiveIntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )

    description = models.CharField(max_length=255, null=True)

    def clean(self):
        if self.end_date <= self.start_date:
            raise ValidationError("end_date must be after start_date")
    
    @property
    def computed_status(self):
        now = timezone.localtime(timezone.now())

        start = timezone.localtime(self.start_date)
        end = timezone.localtime(self.end_date)

        if start > now:
            return "preparing"
        elif start <= now <= end:
            return "ongoing"
        return "finished"


class UserProject(models.Model):
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="members"
    )
    group_member = models.ForeignKey(
        GroupMember,
        on_delete=models.CASCADE,
        related_name="projects"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ("project", "group_member")

class ProjectSkill(models.Model):

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="required_skills"
    )

    skill = models.ForeignKey(
        Skill,
        on_delete=models.CASCADE
    )

    required_level = models.PositiveSmallIntegerField(default=1)

    priority = models.PositiveSmallIntegerField(default=1)

class ProjectFile(models.Model):

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="files"
    )

    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True
    )

    file = models.FileField(upload_to="project_files/")

    uploaded_at = models.DateTimeField(auto_now_add=True)

class ActivityLog(models.Model):

    user = models.ForeignKey(User, on_delete=models.CASCADE)

    project = models.ForeignKey(Project, on_delete=models.CASCADE)

    action = models.CharField(max_length=255)

    created_at = models.DateTimeField(auto_now_add=True)