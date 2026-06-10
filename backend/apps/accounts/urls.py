#apps/accounts/urls.py
from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,

    # RequestPasswordResetView,
    # ResetPasswordConfirmView
)
from .views import RegisterView, LogoutView, MyProfileView, ProfileUpdateView, AvatarUpdateView,     ChangePasswordView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', TokenObtainPairView.as_view(), name='login'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', LogoutView.as_view()),
    path("me/", MyProfileView.as_view(), name="my_profile"),
    path("profile/", ProfileUpdateView.as_view(), name="update_profile"),
    path("profile/avatar/", AvatarUpdateView.as_view(), name="update_profile_avatar"),
    path("change-password/", ChangePasswordView.as_view(), name="change_password"),
    # path(
    #     "password/request-reset/",
    #     RequestPasswordResetView.as_view(),
    #     name="request-password-reset"
    # ),

    # path(
    #     "password/reset-confirm/",
    #     ResetPasswordConfirmView.as_view(),
    #     name="reset-password-confirm"
    # ),
]
