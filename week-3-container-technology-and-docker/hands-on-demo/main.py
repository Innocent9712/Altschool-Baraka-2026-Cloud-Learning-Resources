from fastapi import FastAPI, HTTPException, Depends
from sqlalchemy import create_engine, Column, Integer, String, DateTime, func
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from pydantic import BaseModel, ConfigDict
from datetime import datetime, UTC
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import os
import socket
from typing import List, Optional

# Load environment variables from .env file
load_dotenv()

# Environment variables for database connection
DATABASE_URL = os.environ["DATABASE_URL"]
PORT = int(os.getenv("PORT", 8000))


# SQLAlchemy setup
# pool_pre_ping checks a connection is still alive before using it, so the app
# recovers cleanly if the database container restarts
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Database Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    created_at = Column(DateTime, default=func.now())

# Pydantic Models for API
class UserCreate(BaseModel):
    name: str
    email: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Endpoints use plain `def` (not `async def`) because SQLAlchemy calls here are blocking;
# FastAPI runs them in a thread pool so they don't stall other requests.

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Create tables on startup
@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine, checkfirst=True)
    # Base.metadata.create_all(bind=engine) # This will throw an error if the table already exists
    yield
    # Base.metadata.drop_all(bind=engine)

# FastAPI app
app = FastAPI(title="Demo App", version="1.0.0", lifespan=lifespan)

# Health check endpoint
@app.get("/health")
def health_check():
    # Inside a container, the hostname is the container ID, a nice way to see which container answered
    return {"status": "healthy", "hostname": socket.gethostname(), "timestamp": datetime.now(UTC)}

# Get all users
@app.get("/users", response_model=List[UserResponse])
def get_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    users = db.query(User).offset(skip).limit(limit).all()
    return users

# Get user by ID
@app.get("/users/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# Create new user
@app.post("/users", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    # Check if email already exists
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    db_user = User(name=user.name, email=user.email)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# Delete user
@app.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
