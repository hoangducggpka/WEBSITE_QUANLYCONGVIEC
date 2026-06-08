# apps/tasks/urls.py
from django.urls import path
from .views import (
    BulkCreateTaskView,
    DeleteTaskView,
    MyTaskListView,
    UpdateTaskProgressView,
    ApproveTaskView,
    RemindTaskView,
    WarningTaskView,
    UpdateTaskView,
    RequestHelpView,
    BulkRateTaskView,
    BulkRedoTaskView,
    BulkRemindTaskView,
)

urlpatterns = [
    # Bulk create tasks (leader)
    path("<uuid:project_uuid>/bulk-create/", BulkCreateTaskView.as_view(), name="bulk-create-task"),

    # Bulk delete tasks (leader)
    path("bulk-delete/", DeleteTaskView.as_view(), name="bulk-delete-task"),

    # My assigned tasks
    path("my-tasks/", MyTaskListView.as_view(), name="my-task-list"),

    # Member updates progress (0-100) → status auto-computed
    path("<uuid:task_uuid>/progress/", UpdateTaskProgressView.as_view(), name="update-task-progress"),

    # Leader approves/rejects in-review task
    path("<uuid:task_uuid>/approve/", ApproveTaskView.as_view(), name="approve-task"),

    # Leader sends reminder notification
    path("<uuid:task_uuid>/remind/", RemindTaskView.as_view(), name="remind-task"),

    # Warning tasks dashboard
    path("warning-tasks/", WarningTaskView.as_view(), name="warning-tasks"),

    # Update task name/dates (leader)
    path("<uuid:task_uuid>/update/", UpdateTaskView.as_view(), name="update-task"),

    path("<uuid:task_uuid>/request-help/", RequestHelpView.as_view(), name="request-help"),
    path("bulk-rate/",                         BulkRateTaskView.as_view(),        name="bulk-rate-task"),
    path("bulk-redo/",                         BulkRedoTaskView.as_view(),        name="bulk-redo-task"),
    path("bulk-remind/",                       BulkRemindTaskView.as_view(),      name="bulk-remind-task"),
]

