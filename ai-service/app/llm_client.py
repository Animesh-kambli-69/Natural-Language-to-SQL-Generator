from __future__ import annotations

import os
import re
from functools import lru_cache

import httpx

TABLE_PATTERN = re.compile(r"TABLE\s+([a-zA-Z_][a-zA-Z0-9_.]*)", re.IGNORECASE)


def _month_bucket_expression(dialect: str) -> str:
    if dialect == "mysql":
        return "DATE_FORMAT(t.created_at, '%Y-%m-01')"
    if dialect == "sqlite":
        return "strftime('%Y-%m-01', t.created_at)"
    if dialect == "bigquery":
        return "DATE_TRUNC(DATE(t.created_at), MONTH)"
    return "DATE_TRUNC('month', t.created_at)"


def _pick_table(linked_schema: str) -> str:
    match = TABLE_PATTERN.search(linked_schema)
    if match:
        return match.group(1)
    return "your_table"


def _mock_sql(user_query: str, linked_schema: str, dialect: str) -> str:
    table = _pick_table(linked_schema)
    question = user_query.lower()

    if "top" in question and ("revenue" in question or "sales" in question):
        return (
            f"SELECT t.customer_id, SUM(t.amount) AS total_amount\n"
            f"FROM {table} AS t\n"
            "GROUP BY t.customer_id\n"
            "ORDER BY total_amount DESC\n"
            "LIMIT 10;"
        )

    if "count" in question or "how many" in question:
        return f"SELECT COUNT(*) AS total_rows\nFROM {table};"

    if "monthly" in question or "month" in question:
        month_bucket = _month_bucket_expression(dialect)
        return (
            f"SELECT {month_bucket} AS month_bucket, COUNT(*) AS total_rows\n"
            f"FROM {table} AS t\n"
            "GROUP BY month_bucket\n"
            "ORDER BY month_bucket DESC\n"
            "LIMIT 12;"
        )

    if "latest" in question or "recent" in question:
        return f"SELECT *\nFROM {table}\nORDER BY created_at DESC\nLIMIT 20;"

    return f"SELECT *\nFROM {table}\nLIMIT 50;"


@lru_cache(maxsize=512)
def _cached_mock(user_query: str, linked_schema: str, dialect: str) -> str:
    return _mock_sql(user_query=user_query, linked_schema=linked_schema, dialect=dialect)


async def generate_sql_from_llm(prompt: str, user_query: str, linked_schema: str, dialect: str) -> tuple[str, str, str]:
    llm_mode = os.getenv("LLM_MODE", "mock").lower()
    model_name = os.getenv("LLM_MODEL_NAME", "codellama-7b-qlora")

    if llm_mode != "external":
        sql = _cached_mock(user_query=user_query, linked_schema=linked_schema, dialect=dialect)
        return sql, "mock", model_name

    endpoint = os.getenv("EXTERNAL_LLM_URL")
    api_key = os.getenv("EXTERNAL_LLM_API_KEY")
    if not endpoint or not api_key:
        sql = _cached_mock(user_query=user_query, linked_schema=linked_schema, dialect=dialect)
        return sql, "mock-fallback", model_name

    headers = {"Authorization": f"Bearer {api_key}"}
    payload = {"prompt": prompt, "max_tokens": 220, "temperature": 0.1}

    async with httpx.AsyncClient(timeout=0.8) as client:
        response = await client.post(endpoint, json=payload, headers=headers)
        response.raise_for_status()

    data = response.json()
    sql = (data.get("sql") or data.get("text") or "").strip()
    if not sql:
        sql = _cached_mock(user_query=user_query, linked_schema=linked_schema, dialect=dialect)
        return sql, "mock-fallback", model_name

    return sql, "external", model_name
