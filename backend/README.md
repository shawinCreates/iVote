# iVote Backend — FastAPI + PostgreSQL

Secure online voting backend built with **FastAPI**, **SQLAlchemy**, and **PostgreSQL**. Features Paillier homomorphic encryption, face verification (facenet-pytorch), and automated election lifecycle scheduling.

---

## Prerequisites

- Python 3.13+
- PostgreSQL
- Git

---

## Setup

```bash
git clone https://github.com/shawinCreates/iVote.git
cd iVote/backend
pip install -r requirements.txt
```

Create a `.env` file in the project root (`iVote/.env`) or in `backend/.env`:

```env
DATABASE_URL=postgresql+psycopg2://user:pass@localhost:5432/ivotedb
SECRET_KEY=your-strong-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
CORS_ORIGINS=http://localhost:3000
```

```bash
python -m init_db
uvicorn app.main:app --reload
```

---

## Create Admin User

```bash
python manage.py create-admin --email admin@example.com --password "Str0ng!Pass" --name "Admin Name"
python manage.py list-admins
```

---

## Project Structure

```
backend/
├── app/
│   ├── main.py                      # FastAPI app entry point
│   ├── core/
│   │   ├── config.py                # Env vars, constants, upload dirs
│   │   ├── security.py              # bcrypt password hashing
│   │   ├── paillier.py              # Pure-Python Paillier HE (2048-bit)
│   │   ├── crypto.py                # Paillier serialization wrappers
│   │   ├── middleware.py            # Security headers, rate limit, audit logging
│   │   ├── email_service.py         # SendGrid password reset
│   │   └── cloudinary_storage.py    # Cloudinary upload helpers
│   ├── db/
│   │   ├── database.py              # SQLAlchemy engine/session
│   │   └── models.py                # 9 models: User, Election, Position, Candidate,
│   │                                  VoterParticipation, EncryptedVote, HETally,
│   │                                  AuditLog, Notification
│   ├── routers/
│   │   ├── auth.py                  # Login, register (4 stages), password reset
│   │   ├── users.py                 # Student verification/rejection (admin)
│   │   ├── elections.py             # Election CRUD, status management, audit logs
│   │   ├── candidates.py            # Apply, approve/reject, photo serving
│   │   ├── voting.py                # Face verify, cast encrypted ballot
│   │   └── results.py               # View/publish results
│   ├── schemas/
│   │   └── schemas.py               # 19 Pydantic V2 models
│   ├── services/
│   │   ├── auth_services.py         # User CRUD, registration workflow
│   │   ├── election_service.py      # Election lifecycle, CSV audit export
│   │   ├── candidate_service.py     # Candidacy management
│   │   ├── voting_service.py        # Ballot validation & casting
│   │   ├── result_service.py        # Results computation & publishing
│   │   ├── face_verification_service.py  # facenet-pytorch face match + liveness
│   │   ├── deepface_verification_service.py  # DeepFace alternative
│   │   ├── he_tally_service.py      # Homomorphic tally + key erasure
│   │   ├── audit_notification_service.py  # Audit log & notification helpers
│   │   └── schedular_service.py     # APScheduler auto-transitions
│   └── utils/
│       ├── dependencies.py          # JWT auth dependencies
│       └── helpers.py               # Token creation, password helpers
├── manage.py                        # Admin CLI tool
├── init_db.py                       # Database initialization
└── requirements.txt
```

---

## API Endpoints

| Prefix | Description |
|--------|-------------|
| `/api/auth` | Login, register (4 stages), forgot/reset password, profile |
| `/api/admin/students` | List, verify, reject student registrations |
| `/api/elections` | List active elections, get HE public key |
| `/api/admin/elections` | Create, manage status, lock candidates, stats |
| `/api/candidates` | Apply, view candidates, get photo |
| `/api/admin/candidates` | Approve/reject candidates |
| `/api/vote`, `/api/voting/verify-face` | Face verification + cast encrypted ballot |
| `/api/elections/{id}/results` | Published results |
| `/api/admin/audit-logs` | Audit log viewer + CSV export |
| `/health` | Database connectivity health check |

Interactive docs at http://localhost:8000/docs

---

## Key Architecture Decisions

- **No Alembic** — tables created via `Base.metadata.create_all()` in `main.py`
- **Paillier keys** generated per-election when voting opens; private key erased after tally
- **Face verification** uses facenet-pytorch (InceptionResnetV1 + MTCNN) with blink-based EAR liveness detection
- **Auto-scheduler** runs every 60s to advance election status based on configured dates
- **File uploads** stored locally under `uploads/` with optional Cloudinary fallback
