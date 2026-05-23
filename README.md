# iVote - Secure Voting Platform

A full-stack secure voting application built with a modern architecture:
- **Frontend**: Next.js (React)
- **Backend**: FastAPI (Python)

## 🚀 Getting Started

This repository is ready for GitHub and local development.

### 1. Push to GitHub
First, push this codebase to a GitHub repository:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 2. Run locally
#### Backend
```bash
cd backend
pip install -r requirements.txt
```
Create a `.env` file in `backend/` with the required variables:
```bash
DATABASE_URL=postgresql+psycopg2://<username>:<password>@localhost:5432/ivotedb
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
CORS_ORIGINS=http://localhost:3000
```
Then start the backend:
```bash
uvicorn app.main:app --reload
```

#### Frontend
```bash
cd ../frontend
npm install
npm run dev
```
Open: `http://localhost:3000`

### 3. Production notes
For production, set `NEXT_PUBLIC_API_BASE_URL` to your backend host and configure `CORS_ORIGINS` accordingly. Do not commit secret values.

---

## 📁 Project Structure

---

## 📁 Project Structure

```text
iVote
├─ backend
│  ├─ app
│  │  ├─ core
│  │  │  ├─ config.py
│  │  │  ├─ crypto.py
│  │  │  └─ security.py
│  │  ├─ db
│  │  │  ├─ database.py
│  │  │  ├─ models.py
│  │  │  └─ __init__.py
│  │  ├─ main.py
│  │  ├─ routers
│  │  │  ├─ auth.py
│  │  │  ├─ candidates.py
│  │  │  ├─ elections.py
│  │  │  ├─ results.py
│  │  │  ├─ users.py
│  │  │  ├─ voting.py
│  │  │  └─ __init__.py
│  │  ├─ schemas
│  │  │  └─ schemas.py
│  │  ├─ services
│  │  │  ├─ audit_notification_service.py
│  │  │  ├─ auth_services.py
│  │  │  ├─ candidate_service.py
│  │  │  ├─ election_service.py
│  │  │  ├─ he_tally_service.py
│  │  │  ├─ result_service.py
│  │  │  ├─ schedular_service.py
│  │  │  ├─ voting_service.py
│  │  │  └─ __init__.py
│  │  ├─ uploads
│  │  │  └─ id_cards
│  │  │     └─ idcard_BIT-130.png
│  │  ├─ utils
│  │  │  ├─ dependencies.py
│  │  │  └─ helpers.py
│  │  └─ __init__.py
│  ├─ README.md
│  └─ requirements.txt
├─ frontend
│  ├─ app
│  │  ├─ admin
│  │  │  ├─ audit
│  │  │  │  └─ page.tsx
│  │  │  ├─ candidates
│  │  │  │  └─ page.tsx
│  │  │  ├─ dashboard
│  │  │  │  └─ page.tsx
│  │  │  ├─ elections
│  │  │  │  └─ page.tsx
│  │  │  ├─ results
│  │  │  │  └─ page.tsx
│  │  │  ├─ students
│  │  │  │  └─ page.tsx
│  │  ├─ student
│  │  │  ├─ candidacy
│  │  │  │  └─ page.tsx
│  │  │  ├─ candidates
│  │  │  │  └─ page.tsx
│  │  │  ├─ dashboard
│  │  │  │  └─ page.tsx
│  │  │  ├─ results
│  │  │  │  └─ page.tsx
│  │  │  ├─ vote
│  │  │  │  └─ page.tsx
│  │  ├─ globals.css
│  │  ├─ layout.tsx
│  │  ├─ page.tsx
│  │  └─ register
│  │     └─ page.tsx
│  ├─ components
│  │  └─ AppShell.tsx
│  ├─ lib
│  │  ├─ api.ts
│  │  └─ utils.ts
│  ├─ next.config.mjs
│  ├─ next-env.d.ts
│  ├─ package.json
│  └─ tsconfig.json
├─ LICENSE
└─ uploads
   └─ id_cards
```