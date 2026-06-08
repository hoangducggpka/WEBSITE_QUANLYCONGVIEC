import redis

client = redis.Redis(
    host="127.0.0.1",
    port=6379,
    db=2,
    decode_responses=True
)


def increment_key(key, ttl=300):
    value = client.incr(key)

    if value == 1:
        client.expire(key, ttl)

    return value


def set_cooldown(ip, seconds=600):
    client.setex(f"cooldown:{ip}", seconds, "1")


def is_ip_blocked(ip):
    return client.exists(f"cooldown:{ip}")


def get_counter(key):
    value = client.get(key)
    return int(value) if value else 0