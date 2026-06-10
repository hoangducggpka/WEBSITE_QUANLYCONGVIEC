# apps/security/authentication.py

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken

from apps.security.detectors.jwt_abuse import detect_jwt_abuse


class SecurityJWTAuthentication(JWTAuthentication):

    def authenticate(self, request):
        try:
            return super().authenticate(request)

        except InvalidToken:

            detect_jwt_abuse(
                ip=request.META.get("REMOTE_ADDR"),
                endpoint=request.path,
            )

            raise