from fastapi import APIRouter, HTTPException, status, Request, Depends
from typing import List
from bson import ObjectId
from datetime import datetime
from models import UlasanCreate, UlasanResponse
from auth import get_current_user, TokenData
from jose import jwt
import os

router = APIRouter()

def get_user_id_from_token(current_user: TokenData, request: Request):
    """Extract user_id from token"""
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    
    try:
        SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
        ALGORITHM = os.getenv("ALGORITHM", "HS256")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("user_id")
    except:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

@router.get("/jajanan/{jajanan_id}", response_model=List[UlasanResponse])
async def get_reviews_by_jajanan(jajanan_id: str, request: Request):
    """Get all reviews for a specific jajanan/product"""
    db = request.app.mongodb
    
    # Try both ObjectId and string comparison for compatibility
    ulasan_list = list(db.ulasan.find({"jajanan_id": jajanan_id}))
    
    # If not found, try with ObjectId
    if not ulasan_list and ObjectId.is_valid(jajanan_id):
        ulasan_list = list(db.ulasan.find({"jajanan_id": ObjectId(jajanan_id)}))
    
    for ulasan in ulasan_list:
        ulasan["_id"] = str(ulasan["_id"])
        # Handle both string and ObjectId
        if isinstance(ulasan.get("jajanan_id"), ObjectId):
            ulasan["jajanan_id"] = str(ulasan["jajanan_id"])
        if isinstance(ulasan.get("user_id"), ObjectId):
            ulasan["user_id"] = str(ulasan["user_id"])
    
    return ulasan_list

@router.get("/{ulasan_id}", response_model=UlasanResponse)
async def get_review_by_id(ulasan_id: str, request: Request):
    """Get review by ID"""
    db = request.app.mongodb
    
    if not ObjectId.is_valid(ulasan_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid ulasan ID format"
        )
    
    ulasan = db.ulasan.find_one({"_id": ObjectId(ulasan_id)})
    
    if not ulasan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ulasan not found"
        )
    
    ulasan["_id"] = str(ulasan["_id"])
    ulasan["jajanan_id"] = str(ulasan["jajanan_id"])
    ulasan["user_id"] = str(ulasan["user_id"])
    
    return ulasan

@router.post("/", response_model=UlasanResponse, status_code=status.HTTP_201_CREATED)
async def create_review(
    ulasan: UlasanCreate,
    request: Request,
    current_user: TokenData = Depends(get_current_user)
):
    """Create a new review"""
    db = request.app.mongodb
    user_id = get_user_id_from_token(current_user, request)
    
    # Verify jajanan exists
    if not ObjectId.is_valid(ulasan.jajanan_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid jajanan ID format"
        )
    
    jajanan = db.jajanan.find_one({"_id": ObjectId(ulasan.jajanan_id)})
    if not jajanan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Jajanan not found"
        )
    
    ulasan_dict = ulasan.model_dump()
    ulasan_dict["user_id"] = ObjectId(user_id)
    ulasan_dict["jajanan_id"] = ObjectId(ulasan.jajanan_id)
    ulasan_dict["tanggal"] = datetime.utcnow()
    
    result = db.ulasan.insert_one(ulasan_dict)
    
    created_ulasan = db.ulasan.find_one({"_id": result.inserted_id})
    created_ulasan["_id"] = str(created_ulasan["_id"])
    created_ulasan["jajanan_id"] = str(created_ulasan["jajanan_id"])
    created_ulasan["user_id"] = str(created_ulasan["user_id"])
    
    return created_ulasan

@router.delete("/{ulasan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_review(
    ulasan_id: str,
    request: Request,
    current_user: TokenData = Depends(get_current_user)
):
    """Delete a review (only owner or admin)"""
    db = request.app.mongodb
    user_id = get_user_id_from_token(current_user, request)
    
    if not ObjectId.is_valid(ulasan_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid ulasan ID format"
        )
    
    ulasan = db.ulasan.find_one({"_id": ObjectId(ulasan_id)})
    
    if not ulasan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ulasan not found"
        )
    
    # Check if user owns this review or is admin
    user = db.users.find_one({"_id": ObjectId(user_id)})
    if str(ulasan["user_id"]) != user_id and user.get("peran") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this review"
        )
    
    db.ulasan.delete_one({"_id": ObjectId(ulasan_id)})
    
    return None
