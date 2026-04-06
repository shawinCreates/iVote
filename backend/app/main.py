import os
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from app.db.database import engine, Base
from app.utils.dependencies import get_current_user
from app.services.schedular_service import start

# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title="iVote API",
    description="Backend service for iVote application",
    version="1.0.0"
)

_raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:8000")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

# Allow frontend running on localhost:3000 to talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

BASE_DIR = Path(__file__).resolve().parents[2]

app.mount(
    "/static",
    StaticFiles(directory=str(BASE_DIR / "frontend" / "static")),
    name="static",
)

templates = Jinja2Templates(directory=str(BASE_DIR / "frontend" / "templates"))

@app.on_event("startup")
async def startup():
    start()

@app.get("/uploads/{file_path:path}")
async def serve_upload(
    file_path: str,
    request: Request,
    user=Depends(get_current_user),
):
    """
    Serve uploaded files (ID cards, candidate photos) only to authenticated users.
    Prevents unauthenticated access to student government-issued ID documents.
    """
    import mimetypes
    from fastapi.responses import FileResponse

    # Basic path traversal guard
    safe_path = (BASE_DIR / "uploads" / file_path).resolve()
    uploads_root = (BASE_DIR / "uploads").resolve()
    if not str(safe_path).startswith(str(uploads_root)):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Access denied")
    if not safe_path.exists() or not safe_path.is_file():
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="File not found")

    mime_type, _ = mimetypes.guess_type(str(safe_path))
    return FileResponse(str(safe_path), media_type=mime_type or "application/octet-stream")


# ── Page routes ────────────────────────────────────────────────────────────────

def page(tpl: str):
    async def _handler(request: Request):
        return templates.TemplateResponse(tpl, {"request": request})
    return _handler

app.add_route("/",                    page("login.html"),                   methods=["GET"])
app.add_route("/register",            page("register.html"),                methods=["GET"])

# Student
app.add_route("/student/dashboard",   page("student/dashboard.html"),       methods=["GET"])
app.add_route("/student/candidates",  page("student/candidates.html"),      methods=["GET"])
app.add_route("/student/vote",        page("student/vote.html"),            methods=["GET"])
app.add_route("/student/results",     page("student/results.html"),         methods=["GET"])
app.add_route("/student/candidacy",   page("student/candidacy.html"),       methods=["GET"])

# Admin
app.add_route("/admin/dashboard",     page("admin/dashboard.html"),         methods=["GET"])
app.add_route("/admin/students",      page("admin/students.html"),          methods=["GET"])
app.add_route("/admin/elections",     page("admin/elections.html"),         methods=["GET"])
app.add_route("/admin/candidates",    page("admin/candidates.html"),        methods=["GET"])
app.add_route("/admin/results",       page("admin/results.html"),           methods=["GET"])
app.add_route("/admin/audit",         page("admin/audit.html"),             methods=["GET"])

# Root endpoint
@app.get("/")
def read_root():
    return {"message": "Welcome to iVote API"}