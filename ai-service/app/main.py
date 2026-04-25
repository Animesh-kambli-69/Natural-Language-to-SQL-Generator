from __future__ import annotations

import os
import secrets
import time

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.models import GenerateSQLRequest, GenerateSQLResponse
from app.sql_generator import generate_sql_payload

load_dotenv()

app = FastAPI(title="NL2SQL FastAPI Service", version="1.0.0")

frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

BLOCKED_SECRET_VALUES = {
    "changeme",
    "change-me",
    "replace-me",
    "replace-with-shared-service-token",
    "your-secret",
    "default",
    "secret",
    "password",
    "example",
    "test",
}

COMMON_WEAK_SECRET_PATTERN = "0123|1234|2345|3456|4567|5678|6789|abcd|bcde|cdef|defg|qwerty|asdf|zxcv"


def count_character_classes(value: str) -> int:
    checks = [
        any(char.islower() for char in value),
        any(char.isupper() for char in value),
        any(char.isdigit() for char in value),
        any(not char.isalnum() for char in value),
    ]
    return sum(1 for check in checks if check)


def has_low_entropy_shape(value: str) -> bool:
    unique_chars = len(set(value))
    min_unique_chars = max(4, len(value) // 3)

    is_repeating = len(value) > 0 and value == value[0] * len(value)
    has_common_sequence = any(seq in value.lower() for seq in COMMON_WEAK_SECRET_PATTERN.split("|"))

    return unique_chars < min_unique_chars or is_repeating or has_common_sequence


def validate_service_token(raw_token: str | None) -> str:
    token = (raw_token or "").strip()
    normalized = token.lower()

    looks_placeholder = (
        normalized in BLOCKED_SECRET_VALUES
        or normalized.startswith("replace-with")
        or normalized.startswith("your-")
    )

    if len(token) < 12 or looks_placeholder:
        raise RuntimeError(
            "AI_SERVICE_TOKEN must be set to a strong non-placeholder value (min 12 chars)"
        )

    if count_character_classes(token) < 2 or has_low_entropy_shape(token):
        raise RuntimeError(
            "AI_SERVICE_TOKEN must include mixed character types and avoid predictable patterns"
        )

    return token


internal_service_token = validate_service_token(os.getenv("AI_SERVICE_TOKEN"))

RATE_LIMIT_WINDOW_SECONDS = 60
RATE_LIMIT_MAX_REQUESTS = 60
MAX_TRACKED_USER_BUCKETS = 5000
request_buckets: dict[str, list[float]] = {}


def prune_rate_limit_buckets(now: float) -> None:
    stale_keys = [
        key
        for key, timestamps in request_buckets.items()
        if not timestamps or now - timestamps[-1] >= RATE_LIMIT_WINDOW_SECONDS
    ]
    for key in stale_keys:
        request_buckets.pop(key, None)

    if len(request_buckets) <= MAX_TRACKED_USER_BUCKETS:
        return

    oldest_first = sorted(
        request_buckets.items(),
        key=lambda item: item[1][-1] if item[1] else 0.0,
    )
    overflow = len(request_buckets) - MAX_TRACKED_USER_BUCKETS
    for key, _ in oldest_first[:overflow]:
        request_buckets.pop(key, None)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_origin, "http://localhost:4000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "fastapi-ai"}


@app.post("/generate-sql", response_model=GenerateSQLResponse)
async def generate_sql(
    payload: GenerateSQLRequest,
    request: Request,
    x_internal_service_token: str | None = Header(default=None),
    x_user_id: str | None = Header(default=None),
) -> GenerateSQLResponse:
    if not secrets.compare_digest(x_internal_service_token or "", internal_service_token):
        raise HTTPException(status_code=401, detail="Unauthorized caller")

    if not x_user_id:
        raise HTTPException(status_code=400, detail="Missing user identity")

    caller_key = f"user:{x_user_id}"
    now = time.time()
    prune_rate_limit_buckets(now)
    recent = [
        timestamp
        for timestamp in request_buckets.get(caller_key, [])
        if now - timestamp < RATE_LIMIT_WINDOW_SECONDS
    ]
    if len(recent) >= RATE_LIMIT_MAX_REQUESTS:
        raise HTTPException(status_code=429, detail="Too many AI generation requests")
    recent.append(now)
    request_buckets[caller_key] = recent

    result = await generate_sql_payload(
        user_query=payload.user_query,
        schema_context=payload.schema_context,
        dialect=payload.dialect,
    )

    return GenerateSQLResponse(**result)
