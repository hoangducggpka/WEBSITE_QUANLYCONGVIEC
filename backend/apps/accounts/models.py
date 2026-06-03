#apps/accounts/models.py
from django.db import models
from django.contrib.auth.models import User 
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator

import uuid

class UserProfile(models.Model):
    uuid = models.UUIDField(default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    user_code = models.CharField(max_length=50, null=True)
    fullname = models.CharField(max_length=50)
    address = models.CharField(max_length=500, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    avatarpath = models.ImageField(upload_to='avatars/', null=True, blank=True, default='avatars/8.png')
    reliability_score = models.IntegerField(
        default=10,
        validators=[MinValueValidator(0), MaxValueValidator(10)]
    )


    def __str__(self):
        return self.user.username

# class UserSkill(models.Model):
#     uuid = models.UUIDField(default=uuid.uuid4, editable=False)
#     user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="skills")
#     skill = models.ForeignKey(Skill, on_delete=models.CASCADE, related_name="users")
