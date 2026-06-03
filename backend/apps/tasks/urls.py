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
    RequestHelpView
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
]

# #apps/tasks/urls.py
# from django.urls import path
# from .views import (
#     BulkCreateTaskView,
#     DeleteTaskView,
#     MyTaskListView,
#     UpdateTaskStatusView,
#     WarningTaskView,
#     # UpdateTaskNameView, 
#     # UpdateTaskDatesView
#     UpdateTaskView
# )

# urlpatterns = [
#     # Tạo nhiều task cho 1 project (leader only)
#     path(
#         "<uuid:project_uuid>/bulk-create/",
#         BulkCreateTaskView.as_view(),
#         name="bulk-create-task"
#     ),

#     # Xóa 1 task (leader only)
#     path(
#         "bulk-delete/",
#         DeleteTaskView.as_view(),
#         name="bulk-delete-task"
#     ),

#     path(
#     "my-tasks/",
#     MyTaskListView.as_view(),
#     name="my-task-list"
#     ),
#     path(
#     "<uuid:task_uuid>/update-status/",
#     UpdateTaskStatusView.as_view(),#taskpage
#     name="update-task-status"
#     ),

#     path(
#     "warning-tasks/",
#     WarningTaskView.as_view(),
#     name="warning-tasks"
#     ),
#     path("<uuid:task_uuid>/update_task/", UpdateTaskView.as_view(), name="update-task"),
#     # path("<uuid:task_uuid>/update-dates/", UpdateTaskDatesView.as_view(), name="update-task-dates"),

# ]
