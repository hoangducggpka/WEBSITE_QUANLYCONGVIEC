#apps/accounts/views.py
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .serializers import RegisterSerializer, UserProfileSerializer, ProfileUpdateSerializer, AvatarUpdateSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from rest_framework.parsers import MultiPartParser, FormParser

from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.utils.crypto import get_random_string



RESET_CODES = {}

class RequestPasswordResetView(APIView):


    permission_classes = [AllowAny]

    def post(self, request):

        username = request.data.get("username")
        email = request.data.get("email")

        try:
            user = User.objects.get(
                username=username,
                email=email
            )

        except User.DoesNotExist:
            return Response(
                {"error": "User not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        code = get_random_string(6)

        RESET_CODES[email] = code

        send_mail(
            subject="Reset password",
            message=f"Your reset code is: {code}",
            from_email="noreply@example.com",
            recipient_list=[email],
            fail_silently=False,
        )

        return Response({
            "message": "Reset code sent"
        })


class ResetPasswordConfirmView(APIView):


    permission_classes = [AllowAny]

    def post(self, request):

        email = request.data.get("email")
        code = request.data.get("code")
        new_password = request.data.get("new_password")

        real_code = RESET_CODES.get(email)

        if not real_code or real_code != code:
            return Response(
                {"error": "Invalid code"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(email=email)

        except User.DoesNotExist:
            return Response(
                {"error": "User not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        user.set_password(new_password)
        user.save()

        del RESET_CODES[email]

        return Response({
            "message": "Password reset success"
        })



class AvatarUpdateView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        profile = request.user.profile

        serializer = AvatarUpdateSerializer(
            profile,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():
            profile = serializer.save()

            return Response({
                "avatar": profile.avatarpath.url
            })

        print(serializer.errors)
        return Response(serializer.errors, status=400)

# class AvatarUpdateView(APIView):
#     permission_classes = [IsAuthenticated]

#     def post(self, request):
#         profile = request.user.profile
#         serializer = AvatarUpdateSerializer(profile, data=request.data, partial=True)

#         if serializer.is_valid():
#             profile = serializer.save() 

#             return Response({
#                 "avatar": profile.avatarpath.url
#             })

#         return Response(serializer.errors, status=400)

class ProfileUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        profile = request.user.profile
        serializer = ProfileUpdateSerializer(profile, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(serializer.errors, status=400)

class RegisterView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response(
                {"message": "Register success"},
                status=status.HTTP_201_CREATED
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")

            if not refresh_token:
                return Response(
                    {"error": "Refresh token is required"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            token = RefreshToken(refresh_token)
            token.blacklist()

            return Response(
                {"message": "Logout success"},
                status=status.HTTP_205_RESET_CONTENT
            )

        except Exception as e:
            return Response(
                {"error": "Invalid or expired token"},
                status=status.HTTP_400_BAD_REQUEST
            )
from apps.accounts.models import UserProfile
class MyProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile, created = UserProfile.objects.get_or_create(
            user=request.user
        )
        serializer = UserProfileSerializer(profile)
        return Response(serializer.data)