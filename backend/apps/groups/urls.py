from django.urls import path
from .views import GroupDetailView, LeaveGroupView, MyLedGroupsView, KickMemberView, CreateGroupView, AddMemberView, MyGroupsView, GroupMembersView, SearchGroupView, DeleteGroupView

urlpatterns = [
    path('<uuid:group_uuid>/leave/', LeaveGroupView.as_view()),
    path('create/', CreateGroupView.as_view()),
    path('<uuid:group_uuid>/kick/', KickMemberView.as_view()),
    path('<uuid:group_uuid>/delete/', DeleteGroupView.as_view()),
    path('<uuid:group_uuid>/add_member/', AddMemberView.as_view()),
    path('my-groups/', MyGroupsView.as_view()),
    path('<uuid:group_uuid>/members_groupdetail/', GroupMembersView.as_view()),
    path('my-leader-groups/', MyLedGroupsView.as_view()),
    path("search/", SearchGroupView.as_view(), name="search-group"),
    path("<uuid:group_uuid>/detail/", GroupDetailView.as_view()),
]




