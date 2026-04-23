from __future__ import annotations

import os
import time

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.models import GenerateSQLRequest, GenerateSQLResponse
from app.sql_generator import generate_sql_payload

load_dotenv()

app = FastAPI(title="NL2SQL FastAPI Service", version="1.0.0")

frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
internal_service_token = os.getenv("AI_SERVICE_TOKEN", "")

RATE_LIMIT_WINDOW_SECONDS = 60
RATE_LIMIT_MAX_REQUESTS = 60
request_buckets: dict[str, list[float]] = {}

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
) -> GenerateSQLResponse:
    if internal_service_token and x_internal_service_token != internal_service_token:
        raise HTTPException(status_code=401, detail="Unauthorized caller")

    caller_key = request.client.host if request.client else "unknown"
    now = time.time()
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
