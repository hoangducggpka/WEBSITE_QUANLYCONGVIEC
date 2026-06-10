#!/bin/sh

echo "Waiting for MySQL..."

sleep 10

echo "Running migrations..."

python manage.py migrate

echo "Starting Daphne..."

exec daphne -b 0.0.0.0 -p 8000 config.asgi:application