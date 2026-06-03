# apps/projects/urls.py
from django.urls import path
from .views import (
    CreateProjectView,
    AddProjectMemberView,
    KickProjectMemberView,
    DeleteProjectView,
    MyProjectsView,
    UpdateProjectView,
    ProjectDetailView,
    UpdateProjectNameView,
    UpdateProjectDatesView,
)

urlpatterns = [
    # CRUD
    path("<uuid:group_uuid>/create/",     CreateProjectView.as_view(),   name="create-project"),
    path("delete/",                       DeleteProjectView.as_view(),   name="delete-project"),
    path("<uuid:project_uuid>/update/",   UpdateProjectView.as_view(),   name="update-project"),

    # Detail & list
    path("my-projects/",                          MyProjectsView.as_view(),    name="my-projects"),
    path("<uuid:project_uuid>/detail/",           ProjectDetailView.as_view(), name="project-detail"),

    # Edit name / dates
    path("update-name/<uuid:project_uuid>/",      UpdateProjectNameView.as_view(),  name="update-project-name"),
    path("update-dates/<uuid:project_uuid>/",     UpdateProjectDatesView.as_view(), name="update-project-dates"),

    # Members
    path("<uuid:project_uuid>/members/add/",      AddProjectMemberView.as_view(),  name="add-project-member"),
    path("members/<uuid:userproject_uuid>/kick/", KickProjectMemberView.as_view(), name="kick-project-member"),
]

# #apps/projects/urls.py
# from django.urls import path
# from .views import (
#     CreateProjectView,
#     AddProjectMemberView,
#     DeleteProjectView,
#     MyProjectsView,
#     UpdateProjectView,
#     ProjectDetailView,
#     UpdateProjectNameView, 
#     UpdateProjectDatesView,
#     KickProjectMemberView
# )

# urlpatterns = [
#     # Create project (leader only)
#     path('<uuid:group_uuid>/create/', CreateProjectView.as_view(), name='create-project'),
#     # Add member to project (leader only)
#     path('<uuid:project_uuid>/members/', AddProjectMemberView.as_view(), name='add-project-member'),
#     # Delete project (leader only)
#     path('delete/', DeleteProjectView.as_view(), name='delete-project'),#DELETE
#     path('<uuid:project_uuid>/update/', UpdateProjectView.as_view(), name='update-project'),#UPDATE
#     path("my-projects/", MyProjectsView.as_view(), name="my-projects"),
#     path("<uuid:project_uuid>/detail/", ProjectDetailView.as_view(), name="project-detail"),
#     path("update-name/<uuid:project_uuid>/", UpdateProjectNameView.as_view(), name="update-project-name"),
#     path("update-dates/<uuid:project_uuid>/", UpdateProjectDatesView.as_view(), name="update-project-dates"),
#     path("members/<uuid:userproject_uuid>/", KickProjectMemberView.as_view(), name="kick-project-member"),

# ]
