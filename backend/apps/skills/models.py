#apps/skills.models.py
from django.db import models
from django.contrib.auth.models import User
import uuid


class Skill(models.Model):

    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)

    name = models.CharField(max_length=100, unique=True)

    category = models.CharField(max_length=100, null=True)

    created_at = models.DateTimeField(auto_now_add=True)


class UserSkill(models.Model):

    LEVEL_CHOICES = (
        (1, "Beginner"),
        (2, "Junior"),
        (3, "Intermediate"),
        (4, "Advanced"),
        (5, "Expert"),
    )

    user = models.ForeignKey(
        User,
          on_delete=models.CASCADE,
        related_name="user_skills"
    )

    skill = models.ForeignKey(
        Skill,
        on_delete=models.CASCADE,
        related_name="users"
    )

    level = models.PositiveSmallIntegerField(default=1)

    years_of_experience = models.FloatField(default=0)

    verified = models.BooleanField(default=False)