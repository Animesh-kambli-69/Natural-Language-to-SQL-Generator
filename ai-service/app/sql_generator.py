from __future__ import annotations

import re
from time import perf_counter

from app.llm_client import generate_sql_from_llm
from app.prompting import build_prompt
from app.schema_linking import build_linked_schema

READ_ONLY_PREFIX = re.compile(r"^\s*(with|select)\b", re.IGNORECASE)


def _first_table_name(linked_schema: str) -> str:
    for line in linked_schema.splitlines():
        if line.startswith("TABLE "):
            table_name = line.replace("TABLE ", "").split(":", maxsplit=1)[0].strip()
            if table_name:
                return table_name
    return "your_table"


def _enforce_read_only(sql: str, linked_schema: str) -> str:
    if READ_ONLY_PREFIX.match(sql):
        return sql

    table_name = _first_table_name(linked_schema)
    return f"SELECT * FROM {table_name} LIMIT 50;"


async def generate_sql_payload(user_query: str, schema_context: str, dialect: str) -> dict:
    started_at = perf_counter()

    linked_schema = build_linked_schema(schema_context=schema_context, user_query=user_query)
    prompt = build_prompt(schema_context=linked_schema, user_query=user_query, dialect=dialect)

    sql, provider, model = await generate_sql_from_llm(
        prompt=prompt,
        user_query=user_query,
        linked_schema=linked_schema,
        dialect=dialect,
    )

    safe_sql = _enforce_read_only(sql=sql, linked_schema=linked_schema)

    latency_ms = int((perf_counter() - started_at) * 1000)

    return {
        "sql": safe_sql,
        "prompt": prompt,
        "linked_schema": linked_schema,
        "provider": provider,
        "model": model,
        "dialect": dialect,
        "latency_ms": latency_ms,
    }
