import time
from functools import wraps

def ttl_cache(ttl_seconds=300):
    """Simple in-memory TTL cache to avoid frequent yfinance calls."""
    _cache = {}
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            key = str(args) + str(kwargs)
            if key in _cache:
                val, timestamp = _cache[key]
                if time.time() - timestamp < ttl_seconds:
                    return val
            val = func(*args, **kwargs)
            _cache[key] = (val, time.time())
            return val
        return wrapper
    return decorator
