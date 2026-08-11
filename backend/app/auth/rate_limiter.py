import time
from collections import defaultdict
from fastapi import HTTPException, Request, status


class RateLimiter:
    """
    In-memory sliding-window rate limiter dependency for FastAPI routes.
    Limits each authenticated user (or IP client host fallback) to a maximum number
    of requests within a 60-second window.
    """

    def __init__(self, requests_per_minute: int = 20):
        self.requests_per_minute = requests_per_minute
        self.history: dict[str, list[float]] = defaultdict(list)

    async def __call__(self, request: Request):
        if request.client and request.client.host:
            key = request.client.host
        else:
            key = "anonymous_global"

        now = time.time()
        window_start = now - 60.0

        # Purge entries older than 60 seconds
        self.history[key] = [t for t in self.history[key] if t > window_start]

        if len(self.history[key]) >= self.requests_per_minute:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many chat requests. Try again later.",
            )

        self.history[key].append(now)


# Default chat rate limiter: 20 requests per minute
chat_limiter = RateLimiter(requests_per_minute=20)
