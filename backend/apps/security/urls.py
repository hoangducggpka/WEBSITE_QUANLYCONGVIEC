#apps/security/api/urls.py
from django.urls import path

from .views import SecurityEventListView

urlpatterns = [
    path(
        "events/",
        SecurityEventListView.as_view()
    )
]