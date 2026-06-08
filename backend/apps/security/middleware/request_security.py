#apps/security/middleware/request_security.py
from django.http import JsonResponse
from django.conf import settings

from apps.security.services.redis_service import (
    is_ip_blocked
)


class RequestSecurityMiddleware:

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):

        ip = self.get_ip(request)
        # if ip in settings.WHITELIST_IPS:
        #     return self.get_response(request)
        blocked = is_ip_blocked(ip)

        if blocked and ip not in settings.WHITELIST_IPS:
            return JsonResponse(
                {
                    "error": "IP temporarily blocked"
                },
                status=403
            )
        
        if is_ip_blocked(ip):
            return JsonResponse(
                {
                    "error": "IP temporarily blocked"
                },
                status=403
            )

        response = self.get_response(request)

        if request.path == "/accounts/login/":

            if response.status_code == 401:

                from apps.security.detectors.brute_force import (
                    detect_bruteforce
                )

                detect_bruteforce(
                    ip=ip,
                    endpoint=request.path
                )

        return response

    def get_ip(self, request):

        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")

        if x_forwarded_for:
            return x_forwarded_for.split(",")[0]

        return request.META.get("REMOTE_ADDR")