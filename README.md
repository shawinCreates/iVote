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

```
iVote
├─ LICENSE
├─ README.md
├─ backend
│  ├─ README.md
│  ├─ app
│  │  ├─ __init__.py
│  │  ├─ core
│  │  │  ├─ cloudinary_storage.py
│  │  │  ├─ config.py
│  │  │  ├─ crypto.py
│  │  │  ├─ email_service.py
│  │  │  ├─ face_weights
│  │  │  │  ├─ facenet_vggface2.pt
│  │  │  │  └─ haarcascade_frontalface_default.xml
│  │  │  ├─ middleware.py
│  │  │  ├─ paillier.py
│  │  │  └─ security.py
│  │  ├─ db
│  │  │  ├─ __init__.py
│  │  │  ├─ database.py
│  │  │  └─ models.py
│  │  ├─ main.py
│  │  ├─ routers
│  │  │  ├─ __init__.py
│  │  │  ├─ auth.py
│  │  │  ├─ candidates.py
│  │  │  ├─ elections.py
│  │  │  ├─ results.py
│  │  │  ├─ users.py
│  │  │  └─ voting.py
│  │  ├─ schemas
│  │  │  └─ schemas.py
│  │  ├─ services
│  │  │  ├─ __init__.py
│  │  │  ├─ audit_notification_service.py
│  │  │  ├─ auth_services.py
│  │  │  ├─ candidate_service.py
│  │  │  ├─ deepface_verification_service.py
│  │  │  ├─ election_service.py
│  │  │  ├─ face_verification_service.py
│  │  │  ├─ he_tally_service.py
│  │  │  ├─ result_service.py
│  │  │  ├─ schedular_service.py
│  │  │  └─ voting_service.py
│  │  └─ utils
│  │     ├─ dependencies.py
│  │     └─ helpers.py
│  ├─ init_db.py
│  ├─ manage.py
│  └─ requirements.txt
└─ frontend
   ├─ app
   │  ├─ admin
   │  │  ├─ audit
   │  │  │  └─ page.tsx
   │  │  ├─ candidates
   │  │  │  └─ page.tsx
   │  │  ├─ dashboard
   │  │  │  └─ page.tsx
   │  │  ├─ elections
   │  │  │  └─ page.tsx
   │  │  ├─ layout.tsx
   │  │  ├─ page.tsx
   │  │  ├─ results
   │  │  │  └─ page.tsx
   │  │  └─ students
   │  │     └─ page.tsx
   │  ├─ forgot-password
   │  │  └─ page.tsx
   │  ├─ globals.css
   │  ├─ layout.tsx
   │  ├─ not-found.tsx
   │  ├─ page.tsx
   │  ├─ register
   │  │  └─ page.tsx
   │  ├─ reset-password
   │  │  └─ page.tsx
   │  └─ student
   │     ├─ candidacy
   │     │  └─ page.tsx
   │     ├─ candidates
   │     │  └─ page.tsx
   │     ├─ dashboard
   │     │  └─ page.tsx
   │     ├─ layout.tsx
   │     ├─ page.tsx
   │     ├─ results
   │     │  └─ page.tsx
   │     └─ vote
   │        └─ page.tsx
   ├─ components
   │  ├─ AppShell.tsx
   │  ├─ Providers.tsx
   │  ├─ layout
   │  ├─ shared
   │  │  ├─ ConfirmDialog.tsx
   │  │  ├─ ElectionCountdown.tsx
   │  │  ├─ EmptyState.tsx
   │  │  ├─ HEBadge.tsx
   │  │  ├─ NotificationPanel.tsx
   │  │  ├─ Pagination.tsx
   │  │  ├─ ProtectedImage.tsx
   │  │  ├─ SkeletonTable.tsx
   │  │  └─ StarField.tsx
   │  └─ ui
   │     ├─ Alert.tsx
   │     ├─ Badge.tsx
   │     ├─ Button.tsx
   │     ├─ Card.tsx
   │     ├─ FormControls.tsx
   │     ├─ Modal.tsx
   │     └─ Spinner.tsx
   ├─ hooks
   │  ├─ useAuth.ts
   │  ├─ useCamera.ts
   │  ├─ useCountUp.ts
   │  └─ useTheme.ts
   ├─ lib
   │  ├─ api.ts
   │  ├─ formatters.ts
   │  ├─ paillier.ts
   │  └─ store.ts
   ├─ next-env.d.ts
   ├─ next.config.mjs
   ├─ package-lock.json
   ├─ package.json
   ├─ postcss.config.mjs
   ├─ public
   │  └─ favicon.svg
   ├─ tailwind.config.ts
   ├─ tsconfig.json
   └─ tsconfig.tsbuildinfo

```