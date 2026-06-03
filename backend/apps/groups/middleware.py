# apps/groups/middleware.py
from urllib.parse import parse_qs
from channels.middleware import BaseMiddleware


class JwtAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        if scope["type"] == "websocket":
            # Lazy import — tránh AppRegistryNotReady khi asgi.py load sớm
            from django.contrib.auth.models import AnonymousUser
            from django.contrib.auth import get_user_model
            from channels.db import database_sync_to_async
            from rest_framework_simplejwt.tokens import AccessToken
            from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

            qs = parse_qs(scope.get("query_string", b"").decode())
            token_list = qs.get("token", [])

            print(f"[JwtAuthMiddleware] WS connecting, token present: {bool(token_list)}")

            if token_list:
                @database_sync_to_async
                def get_user(raw_token):
                    User = get_user_model()
                    try:
                        token = AccessToken(raw_token)
                        user_id = int(token["user_id"])  # JWT đôi khi lưu string
                        return User.objects.get(id=user_id)
                    except (InvalidToken, TokenError, User.DoesNotExist, KeyError, ValueError) as e:
                        print(f"[JwtAuthMiddleware] Auth failed: {e}")
                        return AnonymousUser()

                scope["user"] = await get_user(token_list[0])
                print(f"[JwtAuthMiddleware] Resolved user: {scope['user']} (id={getattr(scope['user'], 'id', None)})")
            else:
                scope["user"] = AnonymousUser()
                print("[JwtAuthMiddleware] No token → AnonymousUser")

        return await super().__call__(scope, receive, send)


def JwtAuthMiddlewareStack(inner):
    return JwtAuthMiddleware(inner)