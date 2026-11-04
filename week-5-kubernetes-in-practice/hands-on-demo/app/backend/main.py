from fastapi import APIRouter, FastAPI, HTTPException, Depends, status, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, DateTime, func, Text, Boolean, URL, text
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from pydantic import BaseModel, ConfigDict, EmailStr
from datetime import datetime, UTC, timedelta
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import os
import socket
import time
from typing import List, Optional
import bcrypt
import redis
import json

# Load environment variables from .env file
load_dotenv()

# Database connection settings. In Kubernetes, the non-secret values come from a
# ConfigMap and the username/password from a Secret (see the k8s/ folder).
DATABASE_URL = URL.create(
    "postgresql+psycopg",
    username=os.environ["POSTGRES_USER"],
    password=os.environ["POSTGRES_PASSWORD"],
    host=os.getenv("DB_HOST", "localhost"),
    port=int(os.getenv("DB_PORT", 5432)),
    database=os.getenv("POSTGRES_DB", "appdb"),
)
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
PORT = int(os.getenv("PORT", 8000))
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")

# Redis setup
redis_client = redis.from_url(REDIS_URL, decode_responses=True)

# The name of the container (in Kubernetes, the Pod) serving this request
HOSTNAME = socket.gethostname()

# SQLAlchemy setup. pool_pre_ping replaces connections that died, e.g. after the database restarted.
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Database Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    last_login = Column(DateTime, nullable=True)

class Post(Base):
    __tablename__ = "posts"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    content = Column(Text)
    author_id = Column(Integer, index=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

# Pydantic Models for API
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class PostCreate(BaseModel):
    title: str
    content: str
    author_id: int

class PostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None

class PostResponse(BaseModel):
    id: int
    title: str
    content: str
    author_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Utility functions for password hashing
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())

# Redis cache functions
def cache_key(prefix: str, identifier: str) -> str:
    return f"{prefix}:{identifier}"

def cache_user(user: User) -> None:
    cache_data = {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "last_login": user.last_login.isoformat() if user.last_login else None
    }
    redis_client.setex(
        cache_key("user", str(user.id)), 
        timedelta(minutes=15), 
        json.dumps(cache_data)
    )

def get_cached_user(user_id: int) -> Optional[dict]:
    cached = redis_client.get(cache_key("user", str(user_id)))
    if cached:
        return json.loads(cached)
    return None

def invalidate_user_cache(user_id: int) -> None:
    redis_client.delete(cache_key("user", str(user_id)))

def cache_posts_by_author(author_id: int, posts: List[Post]) -> None:
    cache_data = []
    for post in posts:
        cache_data.append({
            "id": post.id,
            "title": post.title,
            "content": post.content,
            "author_id": post.author_id,
            "created_at": post.created_at.isoformat() if post.created_at else None,
            "updated_at": post.updated_at.isoformat() if post.updated_at else None
        })
    redis_client.setex(
        cache_key("posts_by_author", str(author_id)), 
        timedelta(minutes=10), 
        json.dumps(cache_data)
    )

def get_cached_posts_by_author(author_id: int) -> Optional[List[dict]]:
    cached = redis_client.get(cache_key("posts_by_author", str(author_id)))
    if cached:
        return json.loads(cached)
    return None

def invalidate_posts_cache(author_id: int) -> None:
    redis_client.delete(cache_key("posts_by_author", str(author_id)))

# Create tables on startup
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Retry: the database may still be starting, and when several replicas start at
    # once, they race to create the same tables and all but one fail the first time.
    for attempt in range(1, 11):
        try:
            Base.metadata.create_all(bind=engine)
            break
        except Exception as e:
            if attempt == 10:
                raise
            print(f"Database not ready (attempt {attempt}/10): {type(e).__name__}. Retrying in 3s")
            time.sleep(3)
    # Test Redis connection
    try:
        redis_client.ping()
        print("✓ Redis connection successful")
    except Exception as e:
        print(f"✗ Redis connection failed: {e}")
    yield

# FastAPI app
app = FastAPI(title="Enhanced Demo App", version="2.0.0", lifespan=lifespan)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,  # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Every route is served under /api, so an Ingress can send /api to this service
# and everything else to the frontend, on the same address.
api = APIRouter(prefix="/api")

# Liveness: "is this process alive?" Deliberately doesn't check the database or Redis:
# restarting this container wouldn't fix either of those.
@api.get("/health")
async def health_check():
    redis_status = "connected"
    try:
        redis_client.ping()
    except Exception:
        redis_status = "disconnected"
    
    return {
        "status": "healthy",
        "timestamp": datetime.now(UTC),
        "redis": redis_status,
        "pod": HOSTNAME
    }

# Readiness: "can this instance serve requests right now?" Fails while the database
# is unreachable, so Kubernetes stops sending traffic here until it's back.
@api.get("/ready")
def readiness_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        raise HTTPException(status_code=503, detail="database unavailable")
    return {"status": "ready", "pod": HOSTNAME}

# User endpoints
@api.get("/users", response_model=List[UserResponse])
async def get_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(User)
    if search:
        query = query.filter(User.name.ilike(f"%{search}%") | User.email.ilike(f"%{search}%"))
    
    users = query.offset(skip).limit(limit).all()
    return users

@api.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: Session = Depends(get_db)):
    # Try cache first
    cached_user = get_cached_user(user_id)
    if cached_user:
        cached_user['created_at'] = datetime.fromisoformat(cached_user['created_at']) if cached_user['created_at'] else None
        cached_user['last_login'] = datetime.fromisoformat(cached_user['last_login']) if cached_user['last_login'] else None
        return UserResponse(**cached_user)
    
    # If not in cache, get from database
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Cache the user
    cache_user(user)
    return user

@api.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(user: UserCreate, db: Session = Depends(get_db)):
    # Check if email already exists
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    hashed_password = hash_password(user.password)
    db_user = User(
        name=user.name, 
        email=user.email, 
        password_hash=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Cache the new user
    cache_user(db_user)
    return db_user

@api.put("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: int, user_update: UserUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if email is being updated and already exists
    if user_update.email and user_update.email != user.email:
        existing_user = db.query(User).filter(User.email == user_update.email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
    
    # Update user fields
    update_data = user_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    
    db.commit()
    db.refresh(user)
    
    # Update cache
    cache_user(user)
    return user

@api.delete("/users/{user_id}")
async def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(user)
    db.commit()
    
    # Invalidate cache
    invalidate_user_cache(user_id)
    invalidate_posts_cache(user_id)
    
    return {"message": "User deleted successfully"}

@api.post("/auth/login")
async def login(user_login: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_login.email).first()
    if not user or not verify_password(user_login.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is inactive"
        )
    
    # Update last login
    user.last_login = datetime.now(UTC)
    db.commit()
    
    # Update cache
    cache_user(user)
    
    return {"message": "Login successful", "user_id": user.id}

# Post endpoints
@api.get("/posts", response_model=List[PostResponse])
async def get_posts(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    author_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Post)
    if author_id:
        # Try cache first for author-specific posts
        cached_posts = get_cached_posts_by_author(author_id)
        if cached_posts:
            # Convert ISO strings back to datetime objects
            for post in cached_posts:
                post['created_at'] = datetime.fromisoformat(post['created_at']) if post['created_at'] else None
                post['updated_at'] = datetime.fromisoformat(post['updated_at']) if post['updated_at'] else None
            return [PostResponse(**post) for post in cached_posts]
        
        query = query.filter(Post.author_id == author_id)
    
    posts = query.offset(skip).limit(limit).all()
    
    # Cache posts by author if author_id is specified
    if author_id:
        cache_posts_by_author(author_id, posts)
    
    return posts

@api.get("/posts/{post_id}", response_model=PostResponse)
async def get_post(post_id: int, db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found")
    return post

@api.post("/posts", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(post: PostCreate, db: Session = Depends(get_db)):
    # Verify user exists
    user = db.query(User).filter(User.id == post.author_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Author not found")
    
    db_post = Post(
        title=post.title,
        content=post.content,
        author_id=post.author_id
    )
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    
    # Invalidate posts cache for this author
    invalidate_posts_cache(post.author_id)
    
    return db_post

@api.put("/posts/{post_id}", response_model=PostResponse)
async def update_post(post_id: int, post_update: PostUpdate, db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Update post fields
    update_data = post_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(post, field, value)
    
    post.updated_at = datetime.now(UTC)
    db.commit()
    db.refresh(post)
    
    # Invalidate posts cache for this author
    invalidate_posts_cache(post.author_id)
    
    return post

@api.delete("/posts/{post_id}")
async def delete_post(post_id: int, db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found")
    
    author_id = post.author_id
    db.delete(post)
    db.commit()
    
    # Invalidate posts cache for this author
    invalidate_posts_cache(author_id)
    
    return {"message": "Post deleted successfully"}

# Analytics endpoint using Redis
@api.get("/analytics/stats")
async def get_analytics_stats(db: Session = Depends(get_db)):
    # Try to get cached stats
    cached_stats = redis_client.get("analytics:stats")
    if cached_stats:
        return json.loads(cached_stats)
    
    # Calculate fresh stats
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    total_posts = db.query(Post).count()
    
    stats = {
        "total_users": total_users,
        "active_users": active_users,
        "total_posts": total_posts,
        "generated_at": datetime.now(UTC).isoformat()
    }
    
    # Cache for 5 minutes
    redis_client.setex("analytics:stats", timedelta(minutes=5), json.dumps(stats))
    
    return stats

app.include_router(api)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
