import uuid
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Depends

# Schemas
from app.schemas import (UserRegister, UserLogin, 
    TokenResponse, PasswordVerify, UserUpdate
)
# AI Agents & DB
from app.database import graph_db

# Security
from app.security import get_password_hash, verify_password, create_access_token, get_current_user

load_dotenv()

router = APIRouter()
    
# ==========================================
# 1. AUTHENTICATION ROUTES
# ==========================================
@router.post("/api/auth/register", response_model=TokenResponse)
async def register_user(user: UserRegister):
    existing_user = await graph_db.get_user_by_email(user.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = str(uuid.uuid4())
    hashed_password = get_password_hash(user.password)
    
    user_data = {
        "id": user_id,
        "name": user.name,
        "email": user.email,
        "password_hash": hashed_password,
        "role": user.role,
        "age": user.age,
        "country": user.country,
        "origin_city": user.origin_city,
        "nationality": user.nationality,
        "citizenship": user.citizenship,
        "health_condition": user.health_condition,
        "passport_expiry": user.passport_expiry,
        "passport_blank_pages": user.passport_blank_pages,
        "bio": user.bio
    }
    
    try:
        await graph_db.create_user(user_id, user_data)
        access_token = create_access_token(data={"sub": user_id})
        return {
            "access_token": access_token, 
            "token_type": "bearer",
            "user": {"id": user_id, "name": user.name, "email": user.email}
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/api/auth/login", response_model=TokenResponse)
async def login_user(user: UserLogin):
    db_user = await graph_db.get_user_by_email(user.email)
    
    # Safe dictionary access (.get) prevents KeyError
    if not db_user or not verify_password(user.password, db_user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    access_token = create_access_token(data={"sub": db_user.get("id")})
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": {
            "id": db_user.get("id"), 
            "name": db_user.get("name", "Traveler"), # Defaults to Traveler if old account
            "email": db_user.get("email")
        }
    }

@router.get("/api/user/profile", response_model=dict)
async def fetch_user_profile(user_id: str = Depends(get_current_user)):
    """Fetches securely using the strict JWT token. Guests cannot access profiles."""
    profile = await graph_db.get_user_profile(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
    return {"data": profile}

@router.post("/api/user/verify-password")
async def verify_user_password(payload: PasswordVerify, user_id: str = Depends(get_current_user)):
    """Verifies a user's password before allowing them to edit their profile."""
    db_user = await graph_db.get_user_by_id(user_id)
    if not db_user or not verify_password(payload.password, db_user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Incorrect password.")
    return {"status": "success"}

@router.put("/api/user/profile")
async def update_profile(payload: UserUpdate, user_id: str = Depends(get_current_user)):
    """Updates the user's secure travel profile in the database."""
    # Exclude unset fields so we don't wipe out data accidentally
    update_data = payload.model_dump(exclude_unset=True) if hasattr(payload, "model_dump") else payload.dict(exclude_unset=True)
    try:
        await graph_db.update_user_profile(user_id, update_data)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))