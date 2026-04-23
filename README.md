# Natural Language to SQL Generator (JavaScript + FastAPI)

A full-stack web application that converts plain-English questions into SQL with schema-aware prompting.

## Stack

- Frontend: React + Vite + Tailwind CSS (JavaScript)
- Backend API: Node.js + Express + MongoDB (Mongoose)
- AI Service: Python + FastAPI (mock or external LLM mode)

## Core Features Implemented

- Schema Upload and Selection:
  - Users save schema text with dialect metadata.
  - One schema can be selected as the active context for generation.
- Query Interface:
  - Chat-like prompt panel for natural language questions.
  - SQL output rendered in a syntax-highlighted code block using `react-syntax-highlighter`.
- Python Inference Layer:
  - FastAPI endpoint receives user query + schema context.
  - Prompt engineering uses the required template:
    - "Given the following SQL schema: {schema_context}, translate the user's request into a valid PostgreSQL query: {user_query}"
  - Schema linking narrows schema context to relevant tables/columns.
- History Panel:
  - MongoDB stores generated query history per user.
  - Sidebar can re-run previous prompts via backend route.
- Latency Optimization (simulated <900ms target):
  - Express -> FastAPI proxy uses keep-alive HTTP agents.
  - Axios timeout bounded by `LLM_MAX_RESPONSE_MS`.
  - FastAPI mock generation uses cached deterministic responses.

- Security hardening:
  - Backend auth uses httpOnly cookies instead of storing JWT in frontend localStorage.
  - Auth and query endpoints are rate-limited.
  - FastAPI accepts generation requests only with a shared internal service token.

## Architecture and Data Flow

1. User logs in/registers from the React app.
2. User uploads/selects schema in frontend.
3. User submits natural language query.
4. Express route `/api/query/generate` validates auth + schema and forwards request to FastAPI `/generate-sql`.
5. FastAPI performs schema linking + prompt construction and returns SQL.
6. Express persists history in MongoDB and returns SQL + metadata to frontend.
7. Frontend renders highlighted SQL and updates history sidebar.

## Key Endpoints

### Express (backend)

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/schemas`
- `POST /api/schemas`
- `GET /api/history`
- `POST /api/query/generate` (proxy to FastAPI)
- `POST /api/query/rerun/:historyId`

### FastAPI (ai-service)

- `GET /health`
- `POST /generate-sql`

## Local Setup

### 1) Start MongoDB

Option A: Docker

```bash
docker compose up -d
```

Option B: local MongoDB on `mongodb://localhost:27017`

### 2) Configure environment files

Copy examples and edit values:

- root `.env.example`
- `backend/.env.example`
- `frontend/.env.example`
- `ai-service/.env.example`

Make sure the same `AI_SERVICE_TOKEN` value is configured in both backend and ai-service env files.

### 3) Install dependencies

Frontend:

```bash
cd frontend
npm install
```

Backend:

```bash
cd ../backend
npm install
```

AI service:

```bash
cd ../ai-service
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
```

### 4) Run services

Run in three terminals:

Frontend:

```bash
cd frontend
npm run dev
```

Backend:

```bash
cd backend
npm run dev
```

AI service:

```bash
cd ai-service
uvicorn app.main:app --reload --port 8000
```

## Production Bridge Note

For token streaming and lower perceived latency, replace request/response proxying with gRPC streams or WebSocket/SSE between backend and AI service.
