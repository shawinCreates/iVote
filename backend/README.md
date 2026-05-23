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
git clone <your-github-repo-url>
cd iVote/backend
```

## 2. Install Dependencies

```bash
pip install -r requirements.txt
```

## 3. Configure Environment Variables

Create a `.env` file inside the `backend` folder and set the following variables. Cloudinary is required for uploads; the app will not start without it.

```bash
DATABASE_URL=postgresql+psycopg2://<username>:<password>@localhost:5432/ivotedb
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
CORS_ORIGINS=http://localhost:3000
```

- Replace `<username>` and `<password>` with your PostgreSQL credentials.
- Replace `<api_key>`, `<api_secret>`, and `<cloud_name>` with your Cloudinary credentials.

#### Note:

- Create the `ivotedb` database in PostgreSQL before running.

## 4. Run locally

```bash
uvicorn app.main:app --reload
```

## 5. Production note

For production hosting, set `NEXT_PUBLIC_API_BASE_URL` in your frontend deployment to your backend URL and update `CORS_ORIGINS` accordingly. Do not commit any secret values.
