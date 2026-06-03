from rest_framework import serializers
from .models import Request

class RequestSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    fullname = serializers.CharField(source="user.profile.fullname", read_only=True)
    avatarpath = serializers.SerializerMethodField()
    user_code = serializers.CharField(source="user.profile.user_code", read_only=True)

    class Meta:
        model = Request
        fields = [
            "uuid",
            "name",
            "is_approved",
            "created_at",
            #"group",
            "username",
            "fullname",
            "avatarpath",
            "user_code",
        ]

    def get_avatarpath(self, obj):
        request = self.context.get("request")
        profile = obj.user.profile
        if profile.avatarpath and request:
            return request.build_absolute_uri(profile.avatarpath.url)
        return None