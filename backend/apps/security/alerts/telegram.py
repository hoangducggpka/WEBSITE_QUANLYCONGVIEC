# apps/security/alerts/telegram.py

import requests
from django.conf import settings


def send_telegram_alert(message):
    url = (
        f"https://api.telegram.org/bot"
        f"{settings.TELEGRAM_BOT_TOKEN}"
        f"/sendMessage"
    )

    requests.post(
        url,
        json={
            "chat_id": settings.TELEGRAM_CHAT_ID,
            "text": message,
            "parse_mode": "HTML"
        },
        timeout=5
    )