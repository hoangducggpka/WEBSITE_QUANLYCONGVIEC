from django.core.management.base import BaseCommand
from django.utils import timezone
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken


class Command(BaseCommand):
    help = "Cleanup expired JWT tokens"

    def handle(self, *args, **kwargs):
        now = timezone.now()
        expired_tokens = OutstandingToken.objects.filter(expires_at__lt=now)

        count = expired_tokens.count()
        expired_tokens.delete()

        self.stdout.write(
            self.style.SUCCESS(f"Deleted {count} expired tokens")
        )
