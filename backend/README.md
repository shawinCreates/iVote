# iVote Backend - Minimal Setup

This is the backend for the iVote student election system built with **FastAPI** and **PostgreSQL**.

---

## Prerequisites

Make sure you have installed:

- Python 3.13+
- PostgreSQL
- Git

---

## 1. Clone the Repository

```bash
git clone https://github.com/shawinCreates/iVote.git
cd iVote/backend
```

## 2. Install Dependencies

```bash
pip install -r requirements.txt
```

## 3. Configure Environment Variables

Create .env file inside backend folder and set following variable

```bash
Database_URL=postgresql+psycopg2://<username>:<password>@localhost:5432/ivotedb
SECRET_KEY=ivote-super-secret-key-2025-campus-election-system
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
```

- Replace <username> and <password> with your PostgreSQL credentials.

#### Note:

- First create ivotedb in postgresql using pgAdmin

## 4. Run Database Migration

Apply Alembic migrations to create all tables. Run following command once you are in backend folder.

```bash
python -m alembic init alembic   ## Not needed as alembic is already initialized
python -m alembic revision --autogenerate -m "initial"
python -m alembic upgrade head
```
