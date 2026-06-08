# apps/chat/services/chat_service.py
from django.contrib.auth.models import User
from apps.chat.models import Conversation, ConversationMember, Message
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


# ─────────────────────────────────────────────
# 1. PRIVATE CHAT
# ─────────────────────────────────────────────

def get_or_create_private_conversation(user1: User, user2: User):
    existing = (
        Conversation.objects
        .filter(type="private", members__user=user1)
        .filter(members__user=user2)
        .first()
    )
    if existing:
        return existing

    conv = Conversation.objects.create(type="private")
    ConversationMember.objects.bulk_create([
        ConversationMember(conversation=conv, user=user1),
        ConversationMember(conversation=conv, user=user2),
    ])
    return conv


# ─────────────────────────────────────────────
# 2. GROUP CHAT
# ─────────────────────────────────────────────

def add_user_to_group_conversation(group, user):
    conversation = Conversation.objects.filter(type="group", group=group).first()
    if not conversation:
        print(f"[WARN] No conversation found for group {group.id}, creating...")
        conversation = get_or_create_group_conversation(group)

    member, created = ConversationMember.objects.get_or_create(
        conversation=conversation,
        user=user
    )
    if created:
        print(f"[CHAT] Added {user.username} to conversation {conversation.uuid}")
    else:
        print(f"[CHAT] {user.username} already in conversation {conversation.uuid}")

    return member


def get_or_create_group_conversation(group):
    conv, created = Conversation.objects.get_or_create(
        type="group",
        group=group
    )
    if created:
        users = {group.leader}
        for m in group.members.select_related("user"):
            users.add(m.user)

        ConversationMember.objects.bulk_create([
            ConversationMember(conversation=conv, user=u)
            for u in users
        ])
    return conv


# ─────────────────────────────────────────────
# 3. BROADCAST HELPER (dùng chung)
# ─────────────────────────────────────────────

# chat_service.py
def _get_avatar_url(user, request=None):
    if hasattr(user, "profile") and user.profile.avatarpath:
        url = user.profile.avatarpath.url
        if request:
            return request.build_absolute_uri(url)
        from django.conf import settings
        api_base = getattr(settings, "API_BASE_URL", "http://127.0.0.1:8000")
        return f"{api_base}{url}"
    return None
# def _get_avatar_url(user):
#     if hasattr(user, "profile") and user.profile.avatarpath:
#         return user.profile.avatarpath.url
#     return None

# chat_service.py
def _broadcast_message(user, msg: Message, reply_to_data=None, request=None):
    channel_layer = get_channel_layer()
    group_name = f"chat_{msg.conversation.uuid}"

    # Build absolute URL cho file
    file_url = None
    if msg.file:
        file_url = msg.file.url  # relative: /media/chat_files/...
        if request:
            file_url = request.build_absolute_uri(file_url)
        else:
            # Fallback: dùng settings nếu không có request
            from django.conf import settings
            api_base = getattr(settings, "API_BASE_URL", "http://127.0.0.1:8000")
            file_url = f"{api_base}{file_url}"

    payload = {
        "type":          "chat_message",
        "message_id":    msg.id,
        "message_uuid":  str(msg.uuid),
        "message":       msg.content or "",
        "sender_id":     user.id,
        "sender_name":   (
            user.profile.fullname
            if hasattr(user, "profile") and user.profile.fullname
            else user.username
        ),
        "sender_avatar": _get_avatar_url(user),
        "message_type":  msg.type,
        "created_at":    msg.created_at.isoformat(),
        "reply_to":      msg.reply_to_id,
        "reply_to_data": reply_to_data,
        "is_pinned":     msg.is_pinned,
        "is_deleted":    msg.is_deleted,
        "file_url":      file_url,        # ← absolute URL
        "file_name":     msg.file.name.split("/")[-1] if msg.file else None,
    }

    async_to_sync(channel_layer.group_send)(group_name, payload)
    return payload
# def _broadcast_message(user, msg: Message, reply_to_data=None):
#     """Broadcast 1 Message object lên channel layer."""
#     channel_layer = get_channel_layer()
#     group_name = f"chat_{msg.conversation.uuid}"

#     payload = {
#         "type":            "chat_message",
#         "message_id":      msg.id,
#         "message_uuid":    str(msg.uuid),
#         "message":         msg.content or "",
#         "sender_id":       user.id,
#         "sender_name":     (
#             user.profile.fullname
#             if hasattr(user, "profile") and user.profile.fullname
#             else user.username
#         ),
#         "sender_avatar":   _get_avatar_url(user),
#         "message_type":    msg.type,
#         "created_at":      msg.created_at.isoformat(),
#         "reply_to":        msg.reply_to_id,
#         "reply_to_data":   reply_to_data,
#         "is_pinned":       msg.is_pinned,
#         "is_deleted":      msg.is_deleted,
#         "file_url":        msg.file.url if msg.file else None,
#         "file_name":       msg.file.name.split("/")[-1] if msg.file else None,
#     }

#     async_to_sync(channel_layer.group_send)(group_name, payload)
#     return payload


def send_message(user, conversation, content, msg_type="text", reply_to=None):
    msg = Message.objects.create(
        conversation=conversation,
        sender=user,
        content=content,
        type=msg_type,
        reply_to=reply_to,
    )

    reply_to_data = None
    if reply_to:
        reply_to_data = {
            "id":          reply_to.id,
            "content":     reply_to.content,
            "sender_name": (
                reply_to.sender.profile.fullname
                if reply_to.sender and hasattr(reply_to.sender, "profile")
                else (reply_to.sender.username if reply_to.sender else "Unknown")
            ),
            "type": reply_to.type,
        }

    _broadcast_message(user, msg, reply_to_data=reply_to_data)
    return msg

