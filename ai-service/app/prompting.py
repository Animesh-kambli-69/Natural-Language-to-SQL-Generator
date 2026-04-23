SYSTEM_PROMPT_TEMPLATE = (
    "Given the following SQL schema: {schema_context}, "
    "translate the user's request into a valid PostgreSQL query: {user_query}"
)


def build_prompt(schema_context: str, user_query: str, dialect: str) -> str:
    # Keep the required resume-style system template while adding explicit output constraints.
    base_prompt = SYSTEM_PROMPT_TEMPLATE.format(
        schema_context=schema_context,
        user_query=user_query,
    )

    return (
        f"{base_prompt}\n\n"
        f"Target dialect: {dialect}.\n"
        "Rules:\n"
        "1) Output SQL only (no markdown).\n"
        "2) Prefer explicit columns over SELECT *.\n"
        "3) Use table aliases for readability.\n"
        "4) Keep query read-only."
    )
