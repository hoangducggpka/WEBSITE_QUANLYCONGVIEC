# apps/chat/serializers.py
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Conversation, ConversationMember, Message, MessageReaction


class MemberSerializer(serializers.ModelSerializer):
    fullname = serializers.CharField(source="profile.fullname", default="")
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "fullname", "avatar"]

    def get_avatar(self, obj):
        request = self.context.get("request")
        if hasattr(obj, "profile") and obj.profile.avatarpath:
            url = obj.profile.avatarpath.url
            return request.build_absolute_uri(url) if request else url
        return None


class ReactionSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)

    class Meta:
        model = MessageReaction
        fields = ["id", "emoji", "user_id"]


class MessageSerializer(serializers.ModelSerializer):
    sender_id     = serializers.IntegerField(source="sender.id", read_only=True)
    sender_name   = serializers.SerializerMethodField()
    sender_avatar = serializers.SerializerMethodField()
    reply_to_data = serializers.SerializerMethodField()
    reactions     = serializers.SerializerMethodField()
    file_url      = serializers.SerializerMethodField()
    file_name     = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            "id", "uuid", "content", "type",
            "sender_id", "sender_name", "sender_avatar",
            "reply_to", "reply_to_data",
            "file_url", "file_name",
            "reactions",
            "is_pinned", "is_deleted",
            "created_at",
        ]

    def get_sender_name(self, obj):
        if obj.sender and hasattr(obj.sender, "profile"):
            return obj.sender.profile.fullname or obj.sender.username
        return obj.sender.username if obj.sender else "Unknown"

    def get_sender_avatar(self, obj):
        request = self.context.get("request")
        if obj.sender and hasattr(obj.sender, "profile") and obj.sender.profile.avatarpath:
            url = obj.sender.profile.avatarpath.url
            return request.build_absolute_uri(url) if request else url
        return None

    def get_reply_to_data(self, obj):
        """Trả về thông tin tóm tắt của tin nhắn được reply."""
        if not obj.reply_to:
            return None
        ref = obj.reply_to
        return {
            "id":          ref.id,
            "content":     ref.content,
            "sender_name": (
                ref.sender.profile.fullname
                if ref.sender and hasattr(ref.sender, "profile")
                else (ref.sender.username if ref.sender else "Unknown")
            ),
            "type":        ref.type,
        }

    def get_reactions(self, obj):
        """
        Trả về dạng gộp: [{ emoji, count, users: [user_id,...] }]
        để FE dễ render reaction chips.
        """
        grouped = {}
        for r in obj.reactions.select_related("user"):
            if r.emoji not in grouped:
                grouped[r.emoji] = {"emoji": r.emoji, "count": 0, "users": []}
            grouped[r.emoji]["count"] += 1
            grouped[r.emoji]["users"].append(r.user.id)
        return list(grouped.values())

    def get_file_url(self, obj):
        request = self.context.get("request")
        if obj.file:
            return request.build_absolute_uri(obj.file.url) if request else obj.file.url
        return None

    def get_file_name(self, obj):
        if obj.file:
            return obj.file.name.split("/")[-1]
        return None


class ConversationSerializer(serializers.ModelSerializer):
    members      = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()
    display_avatar = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            "id", "uuid", "type",
            "display_name", "display_avatar",
            "members", "last_message", "unread_count",
            "created_at",
        ]

    def _get_other_member(self, obj):
        request = self.context.get("request")
        if not request:
            return None
        return (
            obj.members
               .exclude(user=request.user)
               .select_related("user__profile")
               .first()
        )

    def get_display_name(self, obj):
        if obj.type == "group" and obj.group:
            return obj.group.name
        other = self._get_other_member(obj)
        if other:
            return (
                other.user.profile.fullname
                if hasattr(other.user, "profile")
                else other.user.username
            )
        return "Unknown"

    def get_display_avatar(self, obj):
        request = self.context.get("request")
        if obj.type == "group":
            return None
        other = self._get_other_member(obj)
        if other and hasattr(other.user, "profile") and other.user.profile.avatarpath:
            url = other.user.profile.avatarpath.url
            return request.build_absolute_uri(url) if request else url
        return None

    def get_members(self, obj):
        users = [m.user for m in obj.members.select_related("user__profile").all()]
        return MemberSerializer(users, many=True, context=self.context).data

    def get_last_message(self, obj):
        msg = obj.messages.filter(is_deleted=False).order_by("-created_at").first()
        return MessageSerializer(msg, context=self.context).data if msg else None

    def get_unread_count(self, obj):
        request = self.context.get("request")
        if not request:
            return 0
        try:
            member = obj.members.get(user=request.user)
            if member.last_seen is None:
                return obj.messages.filter(is_deleted=False).count()
            return obj.messages.filter(
                created_at__gt=member.last_seen,
                is_deleted=False
            ).exclude(sender=request.user).count()
        except ConversationMember.DoesNotExist:
            return 0

# # apps/chat/serializers.py
# from rest_framework import serializers
# from django.contrib.auth.models import User
# from .models import Conversation, ConversationMember, Message


# class MemberSerializer(serializers.ModelSerializer):
#     fullname = serializers.CharField(source="profile.fullname", default="")
#     avatar = serializers.SerializerMethodField()

#     class Meta:
#         model = User
#         fields = ["id", "username", "fullname", "avatar"]

#     def get_avatar(self, obj):
#         request = self.context.get("request")
#         if hasattr(obj, "profile") and obj.profile.avatarpath:
#             url = obj.profile.avatarpath.url
#             return request.build_absolute_uri(url) if request else url
#         return None


# class MessageSerializer(serializers.ModelSerializer):
#     sender_id = serializers.IntegerField(source="sender.id", read_only=True)
#     sender_name = serializers.SerializerMethodField()
#     sender_avatar = serializers.SerializerMethodField()

#     class Meta:
#         model = Message
#         fields = [
#             "id", "uuid", "content", "type",
#             "sender_id", "sender_name", "sender_avatar",
#             "reply_to", "created_at", "is_deleted"
#         ]

#     def get_sender_name(self, obj):
#         if obj.sender and hasattr(obj.sender, "profile"):
#             return obj.sender.profile.fullname
#         return obj.sender.username if obj.sender else "Unknown"

#     def get_sender_avatar(self, obj):
#         request = self.context.get("request")
#         if obj.sender and hasattr(obj.sender, "profile") and obj.sender.profile.avatarpath:
#             url = obj.sender.profile.avatarpath.url
#             return request.build_absolute_uri(url) if request else url
#         return None


# class ConversationSerializer(serializers.ModelSerializer):
#     members = serializers.SerializerMethodField()
#     last_message = serializers.SerializerMethodField()
#     unread_count = serializers.SerializerMethodField()
#     # Với group chat — tên lấy từ Group, private chat — tên đối phương
#     display_name = serializers.SerializerMethodField()
#     display_avatar = serializers.SerializerMethodField()

#     class Meta:
#         model = Conversation
#         fields = [
#             "id", "uuid", "type",
#             "display_name", "display_avatar",
#             "members", "last_message", "unread_count",
#             "created_at"
#         ]

#     def _get_other_member(self, obj):
#         """Với private chat, trả về user còn lại."""
#         request = self.context.get("request")
#         if not request:
#             return None
#         return obj.members.exclude(user=request.user).select_related("user__profile").first()

#     def get_display_name(self, obj):
#         if obj.type == "group" and obj.group:
#             return obj.group.name
#         other = self._get_other_member(obj)
#         if other:
#             if hasattr(other.user, "profile"):
#                 return other.user.profile.fullname
#             return other.user.username
#         return "Unknown"

#     def get_display_avatar(self, obj):
#         request = self.context.get("request")
#         if obj.type == "group":
#             return None  # Có thể thêm group avatar sau
#         other = self._get_other_member(obj)
#         if other and hasattr(other.user, "profile") and other.user.profile.avatarpath:
#             url = other.user.profile.avatarpath.url
#             return request.build_absolute_uri(url) if request else url
#         return None

#     def get_members(self, obj):
#         users = [m.user for m in obj.members.select_related("user__profile").all()]
#         return MemberSerializer(users, many=True, context=self.context).data

#     def get_last_message(self, obj):
#         msg = obj.messages.filter(is_deleted=False).order_by("-created_at").first()
#         if not msg:
#             return None
#         return MessageSerializer(msg, context=self.context).data

#     def get_unread_count(self, obj):
#         request = self.context.get("request")
#         if not request:
#             return 0
#         try:
#             member = obj.members.get(user=request.user)
#             if member.last_seen is None:
#                 return obj.messages.filter(is_deleted=False).count()
#             return obj.messages.filter(
#                 created_at__gt=member.last_seen,
#                 is_deleted=False
#             ).exclude(sender=request.user).count()
#         except ConversationMember.DoesNotExist:
#             return 0