from django.urls import path
from .views import (
    CreateRequestView,
    LeaderRequestListView,
    ApproveRequestView,
    RejectRequestView
)

urlpatterns = [
    path("<uuid:group_uuid>/create/", CreateRequestView.as_view(), name="create-request"),
    path("<uuid:group_uuid>/leader/", LeaderRequestListView.as_view(), name="leader-requests"),
    path("approve/<uuid:request_uuid>/", ApproveRequestView.as_view(), name="approve-request"),
    path("reject/<uuid:request_uuid>/", RejectRequestView.as_view(), name="reject-request"),

]