# apps/comments/serializers.py
from rest_framework import serializers
from .models import Comment


class CommentReplySerializer(serializers.ModelSerializer):
    author     = serializers.CharField(source="user.username", read_only=True)
    fullname   = serializers.SerializerMethodField()
    avatarpath = serializers.SerializerMethodField()

    class Meta:
        model  = Comment
        fields = ["uuid", "author", "fullname", "avatarpath", "content", "created_at", "is_edited"]

    def get_fullname(self, obj):
        return getattr(getattr(obj.user, "profile", None), "fullname", obj.user.username)

    def get_avatarpath(self, obj):
        request = self.context.get("request")
        profile = getattr(obj.user, "profile", None)
        if profile and profile.avatarpath and request:
            return request.build_absolute_uri(profile.avatarpath.url)
        return None


class CommentSerializer(serializers.ModelSerializer):
    author     = serializers.CharField(source="user.username", read_only=True)
    fullname   = serializers.SerializerMethodField()
    avatarpath = serializers.SerializerMethodField()
    replies    = serializers.SerializerMethodField()
    is_mine    = serializers.SerializerMethodField()
    pinned     = serializers.BooleanField(source="is_pinned", read_only=True)

    class Meta:
        model  = Comment
        fields = [
            "uuid", "author", "fullname", "avatarpath",
            "content", "created_at", "is_edited", "pinned",
            "replies", "is_mine",
        ]

    def get_fullname(self, obj):
        return getattr(getattr(obj.user, "profile", None), "fullname", obj.user.username)

    def get_avatarpath(self, obj):
        request = self.context.get("request")
        profile = getattr(obj.user, "profile", None)
        if profile and profile.avatarpath and request:
            return request.build_absolute_uri(profile.avatarpath.url)
        return None

    def get_replies(self, obj):
        replies = obj.replies.order_by("created_at").select_related("user__profile")
        return CommentReplySerializer(replies, many=True, context=self.context).data

    def get_is_mine(self, obj):
        request = self.context.get("request")
        return bool(request and obj.user == request.user)