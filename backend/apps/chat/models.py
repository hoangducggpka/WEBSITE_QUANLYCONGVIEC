from django.db import models
from django.contrib.auth.models import User

from apps.groups.models import Group
from apps.projects.models import Project

import uuid


class Conversation(models.Model):

    TYPES = (
        ("private", "Private"),
        ("group", "Group"),
        ("project", "Project"),
    )

    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)

    type = models.CharField(max_length=20, choices=TYPES)

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )

    group = models.ForeignKey(
        Group,
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)


class ConversationMember(models.Model):

    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="members"
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE
    )

    joined_at = models.DateTimeField(auto_now_add=True)

    last_seen = models.DateTimeField(null=True)


class Message(models.Model):

    TYPES = (
        ("text", "Text"),
        ("image", "Image"),
        ("file", "File"),
        ("system", "System"),
    )

    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)

    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="messages"
    )

    sender = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True
    )

    content = models.TextField(null=True, blank=True)

    type = models.CharField(max_length=20, choices=TYPES)

    file = models.FileField(
        upload_to="chat_files/",
        null=True,
        blank=True
    )

    reply_to = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)

    is_deleted = models.BooleanField(default=False)

class MessageReaction(models.Model):

    message = models.ForeignKey(
        Message,
        on_delete=models.CASCADE,
        related_name="reactions"
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE
    )

    emoji = models.CharField(max_length=20)