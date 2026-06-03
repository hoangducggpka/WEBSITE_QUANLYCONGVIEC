#apps/groups/models.py
from django.db import models
from django.contrib.auth.models import User
import uuid


class Group(models.Model):
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    name = models.CharField(max_length=225, unique=True)
    name_normalized = models.CharField(max_length=225, null=True, db_index=True)
    leader = models.ForeignKey(User, on_delete=models.CASCADE, related_name="led_groups")
    created_at = models.DateTimeField(auto_now_add=True)

    color = models.CharField(max_length=225, null=True)


    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        from .utils import normalize_text
        self.name_normalized = normalize_text(self.name)
        super().save(*args, **kwargs)

class GroupMember(models.Model):
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="group_memberships")
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name="members")
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "group")
