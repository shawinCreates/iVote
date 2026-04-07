import os

from fastapi import  FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from app.db.database import engine, Base
from app.services.schedular_service import start

from app.routers import auth, elections, results, users, voting
from app.routers.candidates import student_router, admin_router
from app.core.config import BASE_DIR


Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="iVote API",
    description="Backend service for iVote application",
    version="1.0.0"
)

_raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:8000")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.mount(
    "/static",
    StaticFiles(directory=str(BASE_DIR / "frontend" / "static")),
    name="static",
)

templates = Jinja2Templates(directory=str(BASE_DIR / "frontend" / "templates"))

app.include_router(auth.router)
app.include_router(student_router)
app.include_router(admin_router)
app.include_router(elections.router)
app.include_router(results.router)
app.include_router(users.router)
app.include_router(voting.router)

@app.on_event("startup")
async def startup():
    start()

# Page routes
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