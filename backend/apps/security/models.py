#apps/security/models.py
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class SecurityEvent(models.Model):

    EVENT_CHOICES = [
        ("LOGIN_BRUTEFORCE", "Login Bruteforce"),
        ("JWT_ABUSE", "JWT Abuse"),
        ("FORCE_LOGOUT", "Force Logout"),
    ]

    SEVERITY_CHOICES = [
        ("LOW", "Low"),
        ("MEDIUM", "Medium"),
        ("HIGH", "High"),
        ("CRITICAL", "Critical"),
    ]

    user = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )

    ip_address = models.GenericIPAddressField()

    endpoint = models.CharField(max_length=255)

    event_type = models.CharField(max_length=50)

    severity = models.CharField(max_length=20)

    description = models.TextField()

    metadata = models.JSONField(default=dict)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]