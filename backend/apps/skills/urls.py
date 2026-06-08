# apps/skills/urls.py
from django.urls import path
from .views import CreateSkillView, DeleteUserSkillView, MySkillsView

urlpatterns = [
    path('create/', CreateSkillView.as_view(), name='create_skill'),
    path('delete/<uuid:skill_uuid>/', DeleteUserSkillView.as_view(), name='delete_user_skills'),
    path("my-skills/", MySkillsView.as_view(), name="my-skills"),
    
]