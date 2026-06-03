from django.db import models
from django.contrib.auth.models import User


class UserPerformance(models.Model):

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="performance"
    )

    completed_tasks = models.IntegerField(default=0)

    overdue_tasks = models.IntegerField(default=0)

    reliability_score = models.FloatField(default=100)

    average_completion_time = models.FloatField(default=0)

    burnout_score = models.FloatField(default=0)

    risk_score = models.FloatField(default=0)

    updated_at = models.DateTimeField(auto_now=True)