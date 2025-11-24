from fastapi import APIRouter, HTTPException, status, Request, Depends
from typing import List
from bson import ObjectId
from models import UserResponse
from auth import get_current_user, TokenData

router = APIRouter()

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    request: Request,
    current_user: TokenData = Depends(get_current_user)
):
    """Get current logged-in user information"""
    db = request.app.mongodb
    
    user = db.users.find_one({"email": current_user.email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user["_id"] = str(user["_id"])
    return user

@router.get("/", response_model=List[UserResponse])
async def get_all_users(request: Request):
    """Get all users (admin only in production)"""
    db = request.app.mongodb
    
    users = list(db.users.find())
    for user in users:
        user["_id"] = str(user["_id"])
    
    return users

@router.get("/{user_id}", response_model=UserResponse)
async def get_user_by_id(user_id: str, request: Request):
    """Get user by ID"""
    db = request.app.mongodb
    
    if not ObjectId.is_valid(user_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format"
        )
    
    user = db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user["_id"] = str(user["_id"])
    return user
