#apps/security/api/views.py
from rest_framework.views import APIView
from rest_framework.response import Response

from apps.security.models import SecurityEvent
from .serializers import (
    SecurityEventSerializer
)


class SecurityEventListView(APIView):

    def get(self, request):

        queryset = SecurityEvent.objects.all()[:100]

        serializer = SecurityEventSerializer(
            queryset,
            many=True
        )

        return Response(serializer.data)