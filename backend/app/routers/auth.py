from fastapi import APIRouter, HTTPException, Depends, Header
from app.models.schemas import UserCreate, UserResponse
from app.services.firebase_service import create_firebase_user, verify_firebase_token
from app.db_config import users_collection
from datetime import datetime

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Reusable dependency function for authentication
async def get_current_user(authorization: str = Header(...)) -> dict:
    """
    Dependency to get the current authenticated user.
    Returns the user document from MongoDB.
    """
    token = authorization.replace("Bearer ", "")
    decoded = verify_firebase_token(token)

    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = users_collection.find_one({"firebase_uid": decoded['uid']})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user


async def get_current_user_id(authorization: str = Header(...)) -> str:
    """
    Dependency to get the current authenticated user's ID.
    Returns just the user ID string.
    """
    user = await get_current_user(authorization)
    return str(user["_id"])

@router.post("/register", response_model=UserResponse)
async def register(user: UserCreate):
    # Check if user exists
    if users_collection.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create Firebase user
    try:
        firebase_uid = create_firebase_user(user.email, user.password)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Normalize USN (convert to lowercase and remove any trailing -t or -s)
    usn_normalized = None
    if user.usn:
        usn_normalized = user.usn.lower().rstrip('-t').rstrip('-s')
        # Check if USN already exists
        if users_collection.find_one({"usn": usn_normalized}):
            raise HTTPException(status_code=400, detail="USN already registered")

    # Save to MongoDB
    user_doc = {
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "usn": usn_normalized,
        "firebase_uid": firebase_uid,
        "created_at": datetime.utcnow()
    }
    result = users_collection.insert_one(user_doc)

    user_doc["id"] = str(result.inserted_id)
    return UserResponse(**user_doc)

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user information"""
    current_user["id"] = str(current_user["_id"])
    return UserResponse(**current_user)
