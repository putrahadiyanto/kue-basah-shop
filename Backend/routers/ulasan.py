from fastapi import APIRouter, HTTPException, status, Request, Depends
import logging
from typing import List
from bson import ObjectId
from datetime import datetime
from models import UlasanCreate, UlasanResponse
from auth import get_current_user, TokenData
from jose import jwt
import os

router = APIRouter()

logger = logging.getLogger("uvicorn.error")

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

@router.get("/jajanan/{jajanan_id}")
async def get_reviews_by_jajanan(jajanan_id: str, request: Request):
    """Get all reviews for a specific jajanan/product with user names"""
    db = request.app.mongodb
    
    # Create query to find reviews by jajanan_id (both string and ObjectId)
    query_filters = [{"jajanan_id": jajanan_id}]
    if ObjectId.is_valid(jajanan_id):
        query_filters.append({"jajanan_id": ObjectId(jajanan_id)})
    
    # Use $or to get ALL matching reviews
    ulasan_list = list(db.ulasan.find({"$or": query_filters}))
    
    result = []
    for ulasan in ulasan_list:
        ulasan["_id"] = str(ulasan["_id"])
        # Handle both string and ObjectId
        if isinstance(ulasan.get("jajanan_id"), ObjectId):
            ulasan["jajanan_id"] = str(ulasan["jajanan_id"])
        
        user_id_obj = ulasan.get("user_id")
        if isinstance(user_id_obj, ObjectId):
            user_id = str(user_id_obj)
        else:
            user_id = user_id_obj
        
        ulasan["user_id"] = user_id
        
        # Get user name
        try:
            user = db.users.find_one({"_id": ObjectId(user_id)})
            ulasan["user_name"] = user.get("nama_lengkap", "User") if user else "User"
        except:
            ulasan["user_name"] = "User"
        
        result.append(ulasan)

    return result

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
    """Create a new review (only if purchased and not reviewed yet)"""
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
    
    # 1. Check if user has already reviewed this product
    existing_review = db.ulasan.find_one({
        "user_id": ObjectId(user_id),
        "jajanan_id": ObjectId(ulasan.jajanan_id)
    })
    
    if existing_review:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Anda sudah memberikan ulasan untuk produk ini"
        )

    # 2. Check if user has purchased this product (status 'selesai')
    # Look for an order where user_id matches AND status is 'selesai' AND item_pesanan contains this jajanan_id
    
    # First, let's check with both string and ObjectId formats for jajanan_id
    jajanan_id_str = ulasan.jajanan_id
    jajanan_id_obj = ObjectId(ulasan.jajanan_id) if ObjectId.is_valid(ulasan.jajanan_id) else None
    
    # Try multiple query variations to handle different data formats
    # Use case-insensitive regex for status to handle "selesai", "Selesai", etc.
    status_regex = {"$regex": "^selesai$", "$options": "i"}
    
    query_variations = [
        {
            "pelanggan_id": ObjectId(user_id),
            "status_pesanan": status_regex,
            "item_pesanan": {
                "$elemMatch": {"jajanan_id": jajanan_id_str}
            }
        }
    ]
    
    if jajanan_id_obj:
        query_variations.append({
            "pelanggan_id": ObjectId(user_id),
            "status_pesanan": status_regex,
            "item_pesanan": {
                "$elemMatch": {"jajanan_id": jajanan_id_obj}
            }
        })
    
    # Also try with user_id field (in case it's stored differently)
    query_variations.append({
        "user_id": ObjectId(user_id),
        "status_pesanan": status_regex,
        "item_pesanan": {
            "$elemMatch": {"jajanan_id": jajanan_id_str}
        }
    })
    
    if jajanan_id_obj:
        query_variations.append({
            "user_id": ObjectId(user_id),
            "status_pesanan": status_regex,
            "item_pesanan": {
                "$elemMatch": {"jajanan_id": jajanan_id_obj}
            }
        })
    
    # Try all query variations
    has_purchased = None
    for query in query_variations:
        has_purchased = db.pesanan.find_one(query)
        if has_purchased:
            logger.info(f"Found purchase with query: {query}")
            break
    
    if not has_purchased:
        # Log for debugging
        logger.warning(f"No purchase found for user_id={user_id}, jajanan_id={ulasan.jajanan_id}")
        # Let's check what orders exist for this user
        user_orders = list(db.pesanan.find({"$or": [
            {"pelanggan_id": ObjectId(user_id)},
            {"user_id": ObjectId(user_id)}
        ]}))
        logger.info(f"User has {len(user_orders)} orders total")
        for order in user_orders:
            logger.info(f"Order: status={order.get('status_pesanan')}, items={len(order.get('item_pesanan', []))}")
        
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Anda harus membeli produk ini dan pesanan selesai sebelum memberikan ulasan"
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
