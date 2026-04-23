from __future__ import annotations

import re
from dataclasses import dataclass


TOKEN_PATTERN = re.compile(r"[a-zA-Z_][a-zA-Z0-9_]*")
CREATE_TABLE_PATTERN = re.compile(
    r"create\s+table\s+([a-zA-Z_][a-zA-Z0-9_.]*)\s*\((.*?)\);",
    re.IGNORECASE | re.DOTALL,
)


@dataclass
class TableDefinition:
    name: str
    columns: list[str]


def _extract_tables(schema_context: str) -> list[TableDefinition]:
    tables: list[TableDefinition] = []

    for match in CREATE_TABLE_PATTERN.finditer(schema_context):
        table_name = match.group(1)
        raw_columns = match.group(2)

        columns: list[str] = []
        for line in raw_columns.split(","):
            candidate = line.strip()
            if not candidate:
                continue
            column_name = candidate.split()[0].strip('"`')
            if TOKEN_PATTERN.fullmatch(column_name):
                columns.append(column_name)

        tables.append(TableDefinition(name=table_name, columns=columns))

    return tables


def _score_table(table: TableDefinition, query_tokens: set[str]) -> int:
    score = 0
    table_parts = set(TOKEN_PATTERN.findall(table.name.lower()))
    score += len(query_tokens.intersection(table_parts)) * 3

    for column in table.columns:
        if column.lower() in query_tokens:
            score += 2

    common_time_words = {"day", "week", "month", "year", "date", "time", "recent", "latest"}
    if query_tokens.intersection(common_time_words):
        if any("date" in col.lower() or "time" in col.lower() for col in table.columns):
            score += 2

    metric_words = {"amount", "price", "revenue", "sales", "count", "total", "avg", "average"}
    if query_tokens.intersection(metric_words):
        if any(any(word in col.lower() for word in metric_words) for col in table.columns):
            score += 2

    return score


def build_linked_schema(schema_context: str, user_query: str, max_tables: int = 4) -> str:
    tables = _extract_tables(schema_context)
    if not tables:
        return "\n".join(schema_context.splitlines()[:40])

    query_tokens = {token.lower() for token in TOKEN_PATTERN.findall(user_query.lower())}

    ranked = sorted(
        tables,
        key=lambda table: _score_table(table, query_tokens),
        reverse=True,
    )

    selected = ranked[:max_tables]
    lines: list[str] = []
    for table in selected:
        columns = ", ".join(table.columns[:20]) if table.columns else "(no parsed columns)"
        lines.append(f"TABLE {table.name}: {columns}")

    return "\n".join(lines)
