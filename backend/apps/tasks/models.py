# apps/tasks/models.py
"""
Task model – status now driven by progress + is_approved:
  progress == 0                          → todo
  0 < progress < 100                     → inprogress
  progress == 100 AND is_approved=False  → in_review
  progress == 100 AND is_approved=True   → done
"""

from django.db import models
import uuid
from django.contrib.auth.models import User
from apps.projects.models import UserProject, Project
from apps.skills.models import Skill


class Task(models.Model):

    STATUS_TODO       = "todo"
    STATUS_INPROGRESS = "inprogress"
    STATUS_IN_REVIEW  = "in_review"
    STATUS_DONE       = "done"
    STATUS_OVERDUE    = "overdue"
    STATUS_STUCK      = "stuck"

    STATUS_CHOICES = (
        (STATUS_TODO,       "To Do"),
        (STATUS_INPROGRESS, "In Progress"),
        (STATUS_IN_REVIEW,  "In Review"),
        (STATUS_DONE,       "Done"),
        (STATUS_OVERDUE,    "Overdue"),
        (STATUS_STUCK,      "Stuck"),
    )

    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    name = models.CharField(max_length=225)

    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="tasks"
    )
    assigned_to = models.ForeignKey(
        UserProject,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tasks",
    )

    created_at  = models.DateTimeField(auto_now_add=True)
    start_date  = models.DateTimeField(null=True)
    end_date    = models.DateTimeField(null=True)
    lastupdate  = models.DateTimeField(auto_now=True)

    # ── Progress (0-100) ──────────────────────────────────────────────────
    progress = models.PositiveSmallIntegerField(default=0)   # NEW

    # ── Approval flag (leader approves when progress==100) ────────────────
    is_approved = models.BooleanField(default=False)          # NEW

    # ── Legacy status field (kept for backward compat, auto-computed) ─────
    status = models.CharField(
        max_length=15, choices=STATUS_CHOICES, default=STATUS_TODO
    )

    estimation_time = models.PositiveIntegerField(null=True, blank=True)

    difficulty = models.PositiveSmallIntegerField(
        choices=((1, "Very Easy"), (2, "Easy"), (3, "Medium"), (4, "Hard")),
        default=1,
    )

    rated = models.CharField(
        max_length=15,
        choices=(
            ("bad", "Bad"), ("average", "Average"),
            ("good", "Good"), ("excellent", "Excellent"),
        ),
        null=True, blank=True,
    )

    is_helped  = models.BooleanField(default=False) 
    need_help  = models.BooleanField(default=False)
    is_warned  = models.BooleanField(default=False)
    note       = models.CharField(max_length=255, null=True)
    redoReason = models.CharField(max_length=255, null=True, blank=True)

    estimated_minutes = models.IntegerField(default=0)
    actual_minutes    = models.IntegerField(default=0)
    completed_at      = models.DateTimeField(null=True)
    overdue_hours     = models.FloatField(default=0)
    reopen_count      = models.IntegerField(default=0)

    priority = models.CharField(
        max_length=20,
        choices=(
            ("low", "Low"), ("medium", "Medium"),
            ("high", "High"), ("critical", "Critical"),
        ),
        default="medium",
    )

    difficulty_score = models.FloatField(default=1)
    ai_risk_score    = models.FloatField(default=0)

    # ── Computed status from progress + is_approved ───────────────────────
    @property
    def computed_status(self) -> str:
        if self.progress == 0:
            return self.STATUS_TODO
        if self.progress < 100:
            return self.STATUS_INPROGRESS
        # progress == 100
        return self.STATUS_DONE if self.is_approved else self.STATUS_IN_REVIEW

    def sync_status(self):
        """Write computed_status back to the `status` DB column."""
        self.status = self.computed_status

    def save(self, *args, **kwargs):
        # Auto-calc estimation_time
        if self.start_date and self.end_date:
            delta = self.end_date - self.start_date
            self.estimation_time = int(delta.total_seconds() // 60)

        # Keep `status` in sync with progress/is_approved
        self.sync_status()

        super().save(*args, **kwargs)

    


class TaskSkill(models.Model):
    task  = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="required_skills")
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE)
    required_level = models.PositiveSmallIntegerField(default=1)


class TaskActivity(models.Model):
    ACTIONS = (
        ("created", "Created"),
        ("assigned", "Assigned"),
        ("status_changed", "Status Changed"),
        ("progress_updated", "Progress Updated"),
        ("commented", "Commented"),
        ("completed", "Completed"),
        ("approved", "Approved"),
        ("reopened", "Reopened"),
    )

    task      = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="activities")
    user      = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    action    = models.CharField(max_length=30, choices=ACTIONS)
    old_value = models.CharField(max_length=255, null=True)
    new_value = models.CharField(max_length=255, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

