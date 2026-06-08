#apps/security/api/serializers.py
from rest_framework import serializers

from .models import SecurityEvent


class SecurityEventSerializer(serializers.ModelSerializer):

    class Meta:
        model = SecurityEvent

        fields = "__all__"