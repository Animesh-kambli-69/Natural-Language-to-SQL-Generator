# API Reference

Base URL: `http://localhost:4000`  
All protected routes require an authenticated session (HttpOnly cookie set by `/api/auth/login` or `/api/auth/register`).

---

## Authentication

### POST `/api/auth/register`

Create a new account.

**Rate limit:** 20 requests / 15 minutes (per IP)

**Request body**
```json
{
  "email": "user@example.com",
  "password": "MyStr0ng!Pass"
}
```

| Field | Rules |
|---|---|
| `email` | Valid email format |
| `password` | Minimum 8 characters |

**201 Created**
```json
{
  "user": { "id": "<objectId>", "email": "user@example.com" }
}
```
Sets `nl2sql_auth` HttpOnly cookie containing the JWT.

**400** — Validation error  
**409** — Email already in use

---

### POST `/api/auth/login`

Authenticate an existing account.

**Rate limit:** 20 requests / 15 minutes (per IP)

**Request body**
```json
{
  "email": "user@example.com",
  "password": "MyStr0ng!Pass"
}
```

**200 OK**
```json
{
  "user": { "id": "<objectId>", "email": "user@example.com" }
}
```
Sets `nl2sql_auth` HttpOnly cookie.

**400** — Validation error  
**401** — Invalid credentials

---

### POST `/api/auth/logout`

Clear the auth cookie.

**200 OK**
```json
{ "success": true }
```

---

## Schemas

All schema endpoints require authentication.

### GET `/api/schemas`

List all schemas belonging to the authenticated user, sorted by last update descending.

**200 OK**
```json
{
  "schemas": [
    {
      "_id": "<objectId>",
      "userId": "<objectId>",
      "name": "E-commerce DB",
      "dialect": "postgresql",
      "schemaText": "CREATE TABLE orders ...",
      "isDefault": true,
      "createdAt": "2026-04-25T10:00:00.000Z",
      "updatedAt": "2026-04-25T10:00:00.000Z"
    }
  ]
}
```

---

### POST `/api/schemas`

Create a new schema.

**Request body**
```json
{
  "name": "E-commerce DB",
  "schemaText": "CREATE TABLE orders (id INT, customer_id INT, amount DECIMAL, created_at TIMESTAMP);",
  "dialect": "postgresql",
  "isDefault": true
}
```

| Field | Required | Rules |
|---|---|---|
| `name` | ✅ | Non-empty string |
| `schemaText` | ✅ | Non-empty string (raw DDL) |
| `dialect` | ❌ | `postgresql` \| `mysql` \| `sqlite` \| `redshift` \| `bigquery`; default `postgresql` |
| `isDefault` | ❌ | Boolean; setting to `true` clears `isDefault` on all other user schemas |

**201 Created**
```json
{ "schema": { /* SchemaContext object */ } }
```

**400** — Validation error

---

### PATCH `/api/schemas/:schemaId`

Update an existing schema. Only the owning user may update.

**Request body** (all fields optional)
```json
{
  "name": "Updated Name",
  "schemaText": "CREATE TABLE ...",
  "dialect": "mysql",
  "isDefault": false
}
```

**200 OK**
```json
{ "schema": { /* updated SchemaContext object */ } }
```

**400** — Validation error  
**404** — Schema not found (or not owned by caller)

---

## Query History

### GET `/api/history`

Retrieve the most recent query history for the authenticated user.

**Query parameters**

| Param | Type | Default | Constraints |
|---|---|---|---|
| `limit` | integer | `25` | 1–100 |

**200 OK**
```json
{
  "history": [
    {
      "_id": "<objectId>",
      "userId": "<objectId>",
      "schemaId": "<objectId>",
      "question": "Show me the top 10 customers by revenue",
      "generatedSql": "SELECT t.customer_id, SUM(t.amount) AS total_amount\nFROM orders AS t\nGROUP BY t.customer_id\nORDER BY total_amount DESC\nLIMIT 10;",
      "dialect": "postgresql",
      "sourceLatencyMs": 42,
      "provider": "mock",
      "model": "codellama-7b-qlora",
      "createdAt": "2026-04-25T10:10:00.000Z"
    }
  ]
}
```

---

## Query Generation

All query endpoints require authentication.  
**Rate limit:** 45 requests / 60 seconds (per user)

### POST `/api/query/generate`

Generate SQL from a natural language question.

**Request body**
```json
{
  "question": "Show me the top 10 customers by revenue",
  "schemaId": "<objectId>",
  "dialect": "postgresql"
}
```

| Field | Required | Notes |
|---|---|---|
| `question` | ✅ | Non-empty string |
| `schemaId` | ❌ | If omitted, uses the user's default schema |
| `schemaText` | ❌ | Inline DDL (takes priority over `schemaId`) |
| `dialect` | ❌ | Any of the 5 supported dialects |

**200 OK**
```json
{
  "sql": "SELECT t.customer_id, SUM(t.amount) AS total_amount\nFROM orders AS t\nGROUP BY t.customer_id\nORDER BY total_amount DESC\nLIMIT 10;",
  "prompt": "Given the following SQL schema: ...",
  "dialect": "postgresql",
  "provider": "mock",
  "model": "codellama-7b-qlora",
  "latencyMs": 42,
  "bridgeLatencyMs": 50,
  "linkedSchema": "TABLE orders: id, customer_id, amount, created_at",
  "historyId": "<objectId>"
}
```

**400** — Validation error or missing schema  
**429** — Rate limit exceeded

---

### POST `/api/query/rerun/:historyId`

Re-run a previously generated query using the same question and schema.

**URL parameter:** `historyId` — valid MongoDB ObjectId

**200 OK** — Same shape as `/api/query/generate` response

**400** — Source schema no longer exists  
**404** — History item not found (or not owned by caller)  
**429** — Rate limit exceeded

---

## AI Service — Internal Endpoints

> These endpoints are called by the Express backend only. Direct access is blocked by the `X-Internal-Service-Token` requirement.

Base URL: `http://localhost:8000`

### GET `/health`

```json
{ "status": "ok", "service": "fastapi-ai" }
```

---

### POST `/generate-sql`

**Required headers**

| Header | Value |
|---|---|
| `X-Internal-Service-Token` | Shared secret matching `AI_SERVICE_TOKEN` env var |
| `X-User-Id` | Authenticated user ID (for per-user rate limiting) |

**Request body**
```json
{
  "user_query": "Show me the top 10 customers by revenue",
  "schema_context": "CREATE TABLE orders (id INT, customer_id INT, amount DECIMAL, created_at TIMESTAMP);",
  "dialect": "postgresql"
}
```

| Field | Constraints |
|---|---|
| `user_query` | 1–2000 characters |
| `schema_context` | 1–20000 characters |
| `dialect` | max 50 characters |

**200 OK**
```json
{
  "sql": "SELECT ...",
  "prompt": "Given the following SQL schema: ...",
  "linked_schema": "TABLE orders: id, customer_id, amount, created_at",
  "provider": "mock",
  "model": "codellama-7b-qlora",
  "dialect": "postgresql",
  "latency_ms": 12
}
```

**401** — Invalid or missing service token  
**400** — Missing `X-User-Id` header  
**422** — Pydantic validation error  
**429** — Per-user rate limit exceeded (60 req / 60 s)

---

## Error Response Shape

All errors return JSON:

```json
{ "error": "Human-readable message" }
```

Validation errors (400) return an array:

```json
{
  "errors": [
    { "type": "field", "msg": "Valid email is required", "path": "email", "location": "body" }
  ]
}
```

5xx responses always return:

```json
{ "error": "Internal server error" }
```
