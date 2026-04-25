# Natural Language to SQL Generator

> Translate plain-English questions into safe, dialect-aware SQL using a three-tier architecture: React frontend → Express API → FastAPI AI service.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Repository Structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Running Services](#running-services)
- [Documentation](#documentation)
- [Security](#security)
- [License](#license)

---

## Overview

The **NL2SQL Generator** lets authenticated users describe what data they want in plain English, and automatically produces a safe, read-only SQL query against their uploaded database schema. Queries are always scoped to the requesting user, persisted in history, and can be re-run at any time.

The system runs in three independent processes that communicate over HTTP:

```
Browser (React/Vite :5173)
    │  REST + HttpOnly cookie auth
    ▼
Express API (:4000)   ←→   MongoDB
    │  Internal service token
    ▼
FastAPI AI Service (:8000)
    │  LLM_MODE=mock | external
    ▼
LLM (mock or real endpoint)
```

---

## Architecture

| Tier | Technology | Responsibility |
|---|---|---|
| **Frontend** | React 18 + Vite + Tailwind CSS | UI, auth state, schema/history management |
| **Backend API** | Node 20 + Express 4 + Mongoose | Auth (JWT cookie), business logic, DB persistence, rate limiting |
| **AI Service** | Python 3.14 + FastAPI + Uvicorn | Schema linking, prompt building, LLM call, SQL safety enforcement |
| **Database** | MongoDB 7 | Users, schemas, query history |

Full architecture details → [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

---

## Features

- **Natural Language → SQL** — type a question, get a query
- **Multi-dialect support** — PostgreSQL, MySQL, SQLite, Redshift, BigQuery
- **Schema manager** — save, name, and switch between multiple schemas
- **Query history** — all generated queries persisted and re-runnable
- **JWT cookie auth** — HttpOnly, SameSite, production-secure cookies
- **Read-only enforcement** — AI service rejects any non-SELECT/WITH output
- **Rate limiting** — dual-layer (Express + FastAPI) per-user throttling
- **Mock LLM mode** — works fully offline without an API key

---

## Repository Structure

```
.
├── README.md                  ← you are here
├── CONTRIBUTING.md
├── SECURITY.md
├── .env.example               ← root env reference
├── .gitignore
├── docker-compose.yml         ← MongoDB only
│
├── docs/
│   ├── ARCHITECTURE.md
│   └── API.md
│
├── frontend/                  ← React/Vite SPA
│   ├── README.md
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api/client.js
│   │   └── components/
│   │       ├── AuthPanel.jsx
│   │       ├── HistoryPanel.jsx
│   │       ├── QueryPanel.jsx
│   │       ├── SchemaPanel.jsx
│   │       └── SqlOutput.jsx
│   └── ...
│
├── backend/                   ← Node/Express REST API
│   ├── README.md
│   └── src/
│       ├── server.js
│       ├── config/
│       ├── middleware/
│       ├── models/
│       ├── routes/
│       ├── services/
│       └── utils/
│
└── ai-service/                ← FastAPI AI service
    ├── README.md
    └── app/
        ├── main.py
        ├── models.py
        ├── sql_generator.py
        ├── llm_client.py
        ├── schema_linking.py
        └── prompting.py
```

---

## Prerequisites

| Tool | Minimum version | Notes |
|---|---|---|
| Node.js | 20 | `node --version` |
| npm | 10 | bundled with Node 20 |
| Python | 3.12+ | tested on 3.14 |
| uv | any | fast Python package manager |
| MongoDB | 7 | or use Docker Compose |

---

## Quick Start

### 1 — Clone & set up environment files

```bash
# Copy the example env and fill in real secrets for each service
cp .env.example backend/.env
cp ai-service/.env.example ai-service/.env
cp frontend/.env.example frontend/.env
```

Edit `backend/.env` and replace the placeholder values:

```
JWT_SECRET=<32+ random chars with upper, lower, digit, symbol>
AI_SERVICE_TOKEN=<same value you put in ai-service/.env>
```

### 2 — Start MongoDB

```bash
# Via Docker (recommended)
docker-compose up -d

# Or use a local MongoDB instance on port 27017
```

### 3 — Install dependencies

```bash
# Backend (Node)
cd backend && npm install

# Frontend (Node)
cd ../frontend && npm install

# AI service (Python via uv)
cd ../ai-service
uv venv .venv
uv pip install -r requirements.txt --python .venv/Scripts/python.exe
```

### 4 — Start all three services

Open three terminals (or use a process manager):

```bash
# Terminal 1 — AI service
cd ai-service
.venv/Scripts/python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 — Express backend
cd backend
npm run dev

# Terminal 3 — Frontend
cd frontend
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## Environment Variables

See each service's README for full variable details:

| File | Variables documented |
|---|---|
| [`backend/README.md`](backend/README.md#environment-variables) | `JWT_SECRET`, `MONGO_URI`, `AI_SERVICE_TOKEN`, … |
| [`ai-service/README.md`](ai-service/README.md#environment-variables) | `AI_SERVICE_TOKEN`, `LLM_MODE`, `EXTERNAL_LLM_URL`, … |
| [`frontend/README.md`](frontend/README.md#environment-variables) | `VITE_API_BASE_URL` |

---

## Running Services

| Service | Command | Default port |
|---|---|---|
| MongoDB (Docker) | `docker-compose up -d` | 27017 |
| FastAPI AI service | `.venv/Scripts/python.exe -m uvicorn app.main:app --reload` (from `ai-service/`) | 8000 |
| Express backend | `npm run dev` (from `backend/`) | 4000 |
| Vite frontend | `npm run dev` (from `frontend/`) | 5173 |

Health check endpoints:

```
GET http://localhost:8000/health  →  {"status":"ok","service":"fastapi-ai"}
GET http://localhost:4000/health  →  {"status":"ok","service":"express-api"}
```

---

## Documentation

| Document | Contents |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System design, data flow, component responsibilities |
| [`docs/API.md`](docs/API.md) | Full REST API reference (all endpoints, request/response schemas) |
| [`backend/README.md`](backend/README.md) | Backend setup, env vars, project structure |
| [`ai-service/README.md`](ai-service/README.md) | AI service setup, LLM modes, env vars |
| [`frontend/README.md`](frontend/README.md) | Frontend setup, component map, env vars |
| [`SECURITY.md`](SECURITY.md) | Security model, secret requirements, reporting vulnerabilities |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Branch strategy, code style, PR checklist |

---

## Security

- All secrets are validated for strength at process startup — placeholder values crash the server intentionally.
- SQL output is always enforced read-only by the AI service before returning to the client.
- See [`SECURITY.md`](SECURITY.md) for the full security model.

---

## License

MIT — see `LICENSE` for details.
