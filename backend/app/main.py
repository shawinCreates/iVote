from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.database import engine, Base
from app.routers import auth

# Initialize FastAPI app
app = FastAPI(
    title="iVote API",
    description="Backend service for iVote application",
    version="1.0.0"
)

# Allow frontend running on localhost:3000 to talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables
Base.metadata.create_all(bind=engine)

# Include routers (exposed at root so frontend can call /login and /signup directly)
app.include_router(auth.router)

# Root endpoint
@app.get("/")
def read_root():
    return {"message": "Welcome to iVote API"}