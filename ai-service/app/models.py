from pydantic import BaseModel, Field


class GenerateSQLRequest(BaseModel):
    user_query: str = Field(..., min_length=1, max_length=2000)
    schema_context: str = Field(..., min_length=1, max_length=20000)
    dialect: str = Field(default="postgresql", max_length=50)


class GenerateSQLResponse(BaseModel):
    sql: str
    prompt: str
    linked_schema: str
    provider: str
    model: str
    dialect: str
    latency_ms: int
