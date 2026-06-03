from celery import shared_task
from django.utils import timezone
from .models import Project

@shared_task
def check_project_status():
    now = timezone.now()

    projects = Project.objects.all()

    for p in projects:
        old_status = p.status
        new_status = p.computed_status

        if old_status != new_status:
            p.status = new_status
            p.save(update_fields=["status"])

            print(f"Project {p.name} updated: {old_status} -> {new_status}")

from apps.tasks.models import Task


@shared_task
def check_task_overdue():
    now = timezone.now()

    tasks = Task.objects.filter(
        end_date__lt=now
    ).exclude(
        status="done"
    ).exclude(
        status="overdue"
    )

    updated_count = tasks.update(status="overdue")

    print(f"Updated {updated_count} tasks to overdue")