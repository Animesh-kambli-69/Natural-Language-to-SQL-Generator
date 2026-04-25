# System Architecture

## High-Level Diagram

```
Browser (React/Vite :5173)
    │  REST + HttpOnly cookie
    ▼
Express API (:4000)  ←→  MongoDB :27017
    │  X-Internal-Service-Token
    ▼
FastAPI AI Service (:8000)
    │  (optional)
    ▼
External LLM API
```

---

## Component Responsibilities

### Frontend — React 18 + Vite + Tailwind CSS

| File | Responsibility |
|---|---|
| `App.jsx` | Root state: session, schemas, history, result |
| `AuthPanel.jsx` | Login / register form with mode toggle |
| `SchemaPanel.jsx` | Upload and select active schema |
| `QueryPanel.jsx` | Question input, session turn log, generate button |
| `SqlOutput.jsx` | Syntax-highlighted SQL result + metadata |
| `HistoryPanel.jsx` | Query history with rerun and reuse-prompt actions |
| `api/client.js` | Thin `fetch` wrapper; all API calls routed here |

**Session**: JWT lives in an `HttpOnly` cookie — the frontend never holds the token. Only email is stored in `localStorage` for display.

---

### Backend — Node 20 + Express 4

| Layer | Files | Purpose |
|---|---|---|
| Config | `config/env.js` | Load + validate env vars; crash on weak secrets |
| Config | `config/db.js` | Mongoose connection (pool 10, 5 s timeout) |
| Middleware | `middleware/auth.js` | JWT → `req.user` (cookie or Bearer) |
| Middleware | `middleware/error.js` | Global error handler; 5xx never leaks internals |
| Models | `models/User.js` | Email + bcrypt hash; `comparePassword` / `hashPassword` |
| Models | `models/SchemaContext.js` | Per-user named schemas with dialect + default flag |
| Models | `models/QueryHistory.js` | Immutable generation log |
| Routes | `routes/auth.routes.js` | `/register`, `/login`, `/logout` (20 req / 15 min) |
| Routes | `routes/schema.routes.js` | Schema CRUD (all scoped to `req.user.id`) |
| Routes | `routes/history.routes.js` | GET history, limit 1–100 |
| Routes | `routes/query.routes.js` | `/generate`, `/rerun/:id` (45 req / 60 s) |
| Service | `services/aiProxy.service.js` | Proxy to FastAPI with internal token + user ID |
| Utils | `utils/asyncHandler.js` | Async route error forwarding |

---

### AI Service — Python 3.14 + FastAPI

| File | Responsibility |
|---|---|
| `main.py` | App, CORS, token auth, per-user rate limit, `/health`, `/generate-sql` |
| `models.py` | Pydantic request/response with field-level size constraints |
| `sql_generator.py` | Orchestrates: link → prompt → LLM → enforce read-only |
| `schema_linking.py` | Parse DDL, score tables by relevance, return top-4 compact schema |
| `prompting.py` | Build system prompt with dialect + output rules |
| `llm_client.py` | Mock LLM (LRU cached) or real HTTP call to external endpoint |

**Schema Linking Scoring**
- `+3` per token overlap between table name and query
- `+2` per column name present in the query
- `+2` if query has time words AND table has date/time columns
- `+2` if query has metric words AND table has metric columns

**Read-Only Enforcement**: any LLM output not matching `^\s*(select|with)\b` is replaced with `SELECT * FROM <first_table> LIMIT 50;`.

---

## Data Flow — SQL Generation

```
1. User submits question  →  POST /api/query/generate
2. requireAuth validates JWT cookie
3. queryRateLimiter: 45 req / 60 s per user
4. Fetch SchemaContext WHERE _id = schemaId AND userId = req.user.id
5. aiProxy → POST :8000/generate-sql  (X-Internal-Service-Token, X-User-Id)
6. FastAPI: validate token (timing-safe compare_digest)
7. FastAPI: rate limit 60 req / 60 s per user
8. FastAPI: build_linked_schema (top-4 relevant tables)
9. FastAPI: build_prompt (dialect + rules)
10. FastAPI: generate_sql_from_llm (mock or external)
11. FastAPI: _enforce_read_only (SELECT/WITH only)
12. Express: QueryHistory.create() — persist to MongoDB
13. Return to client: sql, prompt, linked_schema, latency, provider, historyId
```

---

## Database Collections

### `users`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | PK |
| `email` | String | unique, lowercase |
| `passwordHash` | String | bcrypt cost 10 |
| `createdAt/updatedAt` | Date | auto |

### `schemacontexts`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | PK |
| `userId` | ObjectId | FK → users, indexed |
| `name` | String | unique per user |
| `dialect` | String | enum (5 values) |
| `schemaText` | String | raw DDL |
| `isDefault` | Boolean | one true per user |

Indexes: `{ userId:1 }`, `{ userId:1, name:1 }` unique

### `queryhistories`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | PK |
| `userId` | ObjectId | FK → users, indexed |
| `schemaId` | ObjectId | optional FK |
| `question` | String | |
| `generatedSql` | String | |
| `dialect` | String | |
| `sourceLatencyMs` | Number | AI service latency |
| `provider` | String | mock / external |
| `model` | String | |

Indexes: `{ userId:1 }`, `{ userId:1, createdAt:-1 }`

---

## LLM Modes

| `LLM_MODE` | Behaviour |
|---|---|
| `mock` (default) | Pattern-matched responses; no API key needed; LRU cached |
| `external` | POST to `EXTERNAL_LLM_URL` with Bearer key; falls back to mock if missing or empty response |

---

## Security Summary

| Concern | Mechanism |
|---|---|
| JWT storage | HttpOnly cookie — never readable by JS |
| Service auth | Shared token via `secrets.compare_digest` (timing-safe) |
| Secret strength | Min length + char-class diversity validated at startup |
| SQL write ops | `_enforce_read_only` replaces non-SELECT/WITH LLM output |
| Rate limiting | Express (auth + query) + FastAPI (per-user) |
| CORS | Both services lock to `FRONTEND_ORIGIN` env var |
| Error leakage | 5xx always returns generic message |
