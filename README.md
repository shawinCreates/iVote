# iVote — Secure Online Voting System

A university election platform with **end-to-end encrypted voting** using Paillier homomorphic encryption, face verification for voter identity, and a full election lifecycle management system.

- **Frontend**: Next.js 14 (React, TypeScript, Tailwind CSS v4)
- **Backend**: FastAPI (Python, SQLAlchemy, PostgreSQL)
- **Encryption**: Pure-Python Paillier homomorphic encryption (2048-bit keys) — ballots encrypted client-side, tallied server-side without ever decrypting individual votes
- **Face Verification**: facenet-pytorch (InceptionResnetV1 + MTCNN) with blink-based liveness detection

---

## Features

### For Students
- **Multi-stage registration** (credentials → academic details → ID card upload → webcam photo)
- **Browse candidates** per position with profiles and manifestos
- **Apply for candidacy** during nomination periods
- **Cast votes** with face verification (liveness blink detection + face matching) and Paillier-encrypted ballots
- **View published election results** with per-position charts and turnout statistics

### For Election Heads (Admin)
- **Student management** — verify/reject registrations, view ID cards and profile photos
- **Election lifecycle control** — create elections with positions, manage transitions (draft → nomination → voting → closed → results)
- **Candidate management** — approve/reject candidacy applications
- **Homomorphic tally** — automatic encrypted tally aggregation with private key erasure after completion
- **Results publishing** — release results with turnout donut charts and ranked bar charts
- **Audit trail** — full event logging with search and CSV export
- **Automated scheduler** — APScheduler handles automatic status transitions based on configured dates

### Security
- End-to-end encrypted voting (ballots never decrypted individually)
- Face verification + liveness detection for voter identity
- JWT authentication with bcrypt password hashing
- Rate limiting, security headers, request logging middleware
- Audit logging for all write operations
- Private key erasure after tally completion

---

## Quick Start

### Prerequisites
- Python 3.13+
- Node.js 18+
- PostgreSQL

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
```

Create `backend/.env`:

```env
DATABASE_URL=postgresql+psycopg2://user:pass@localhost:5432/ivotedb
SECRET_KEY=a-strong-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
CORS_ORIGINS=http://localhost:3000
```

```bash
python -m init_db
uvicorn app.main:app --reload
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

### Create an Admin

```bash
cd backend
python manage.py create-admin --email admin@example.com --password "Str0ng!Pass" --name "Admin Name"
```

---

## Architecture

```
┌─────────────┐     HTTP/JSON      ┌──────────────┐     SQL      ┌────────────┐
│  Next.js     │ ◄──────────────► │  FastAPI      │ ◄──────────► │ PostgreSQL │
│  (Frontend)  │    JWT Bearer     │  (Backend)    │              │            │
│              │                   │               │              │            │
│  Paillier    │                   │  Paillier     │              │ 9 tables   │
│  encryption  │  encrypted ballot │  homomorphic  │              │            │
│  (client)    │ ─────────────────►│  tally (svr)  │              │            │
└─────────────┘                   └──────────────┘              └────────────┘
```

### Backend (`backend/`)

| Layer | Directory | Description |
|-------|-----------|-------------|
| **Entry** | `app/main.py` | FastAPI app, middleware, router registration, lifespan |
| **Config** | `app/core/config.py` | Environment variables, upload paths, constants |
| **Security** | `app/core/security.py` | bcrypt password hashing |
| **Crypto** | `app/core/paillier.py`, `crypto.py` | Paillier HE implementation (keygen, encrypt, decrypt, sum, verify) |
| **DB** | `app/db/models.py` | 9 SQLAlchemy models (User, Election, Position, Candidate, VoterParticipation, EncryptedVote, HETally, AuditLog, Notification) |
| **Routers** | `app/routers/` | auth, users, elections, candidates, voting, results |
| **Services** | `app/services/` | Business logic for auth, voting, elections, candidates, results, face verification, HE tally, audit, scheduler |
| **Middleware** | `app/core/middleware.py` | Security headers, request logging, rate limiting, audit logging |
| **CLI** | `manage.py` | Admin creation and listing |

### Frontend (`frontend/`)

| Layer | Path | Description |
|-------|------|-------------|
| **Pages** | `app/` | Login, register (4-step), forgot/reset password, admin (5 pages), student (5 pages) |
| **Components** | `components/ui/` | Button, Card, Badge, Modal, FormControls, Alert, Spinner |
| **Shared** | `components/shared/` | NotificationPanel, ElectionCountdown, HEBadge, Pagination, ProtectedImage |
| **Hooks** | `hooks/` | useAuth, useCamera, useTheme, useCountUp |
| **Lib** | `lib/` | API client, Paillier encryption (client-side), store, formatters |

---

### Election Lifecycle

```
DRAFT ──► NOMINATION_OPEN ──► NOMINATION_CLOSED ──► VOTING_OPEN ──► CLOSED ──► RESULTS_PUBLISHED
   ▲            │                    │                    │              │
   └────────────┘                    │                    │              │
      (revert)                       │                    │              │
                         Scheduler auto-advances ◄───────┴──────────────┘
                         based on configured dates
```

- **DRAFT → NOMINATION_OPEN**: When `nomination_start` is reached
- **NOMINATION_OPEN → NOMINATION_CLOSED**: When `nomination_end` is reached
- **NOMINATION_CLOSED → VOTING_OPEN**: When `voting_start` is reached (Paillier keys generated, voter eligibility snapshot)
- **VOTING_OPEN → CLOSED**: When `voting_end` is reached (HE tally runs in background)
- **CLOSED → RESULTS_PUBLISHED**: Admin publishes (HE tally aggregates, decrypts, erases private key)

---

## API Overview

| Group | Base Path | Key Endpoints |
|-------|-----------|---------------|
| Auth | `/api/auth` | login, register (4 stages), forgot/reset password, me, notifications |
| Students | `/api/admin/students` | pending, all, verify, reject |
| Elections | `/api/elections`, `/api/admin/elections` | list, create, update status, lock candidates, stats |
| Candidates | `/api/candidates`, `/api/admin/candidates` | apply, approve/reject, photo serving |
| Voting | `/api/voting`, `/api/vote` | face verification, cast encrypted ballot |
| Results | `/api/elections/{id}/results` | view results (student), publish (admin) |
| Health | `/health` | liveness/readiness probe |
| Audit | `/api/admin/audit-logs` | list, export CSV |

Full OpenAPI docs at http://localhost:8000/docs

---

## License

[MIT](LICENSE)