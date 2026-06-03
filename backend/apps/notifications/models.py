from django.db import models
import uuid
from django.contrib.auth.models import User 
from apps.projects.models import Project, UserProject
# Create your models here.
class Notification(models.Model):
    #uuid = models.UUIDField(default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="Systemnotification", null=True)
    content = models.CharField(max_length=225)
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="check_project",
        null=True
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    is_read = models.BooleanField(default=False, db_index=True)
    priority = models.IntegerField(default=1)#1(Thấp)- 2(Trung bình) - 3(Cao) - 4(Khẩn cấp)
    is_private = models.BooleanField(default=True, db_index=True)


    # def save(self, *args, **kwargs):
    #     if self.project is None and self.user is not None:
    #         self.is_private = True
    #     elif self.user is None and self.project is not None:
    #         self.is_private = False
    #     super().save(*args, **kwargs)