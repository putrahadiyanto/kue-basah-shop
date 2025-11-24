from fastapi import APIRouter, HTTPException, status, Request, Depends
from typing import List
from bson import ObjectId
from datetime import datetime
from models import CartCreate, CartUpdate, CartResponse
from auth import get_current_user, TokenData
from jose import jwt
import os

router = APIRouter()

def get_user_id_from_token(current_user: TokenData, request: Request):
    """Extract user_id from token"""
    # Decode the token to get user_id
    from fastapi.security import OAuth2PasswordBearer
    oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
    
    # Get token from request header
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

@router.get("/me", response_model=CartResponse)
async def get_my_cart(
    request: Request,
    current_user: TokenData = Depends(get_current_user)
):
    """Get current user's cart"""
    db = request.app.mongodb
    user_id = get_user_id_from_token(current_user, request)
    
    cart = db.carts.find_one({"user_id": ObjectId(user_id)})
    
    if not cart:
        # Create empty cart if doesn't exist
        cart = {
            "user_id": ObjectId(user_id),
            "items": [],
            "last_updated": datetime.utcnow()
        }
        result = db.carts.insert_one(cart)
        cart["_id"] = result.inserted_id
    
    cart["_id"] = str(cart["_id"])
    cart["user_id"] = str(cart["user_id"])
    
    return cart

@router.post("/me", response_model=CartResponse)
async def add_to_cart(
    cart_update: CartUpdate,
    request: Request,
    current_user: TokenData = Depends(get_current_user)
):
    """Add or update items in cart"""
    db = request.app.mongodb
    user_id = get_user_id_from_token(current_user, request)
    
    cart = db.carts.find_one({"user_id": ObjectId(user_id)})
    
    cart_dict = cart_update.model_dump()
    cart_dict["last_updated"] = datetime.utcnow()
    
    if cart:
        # Update existing cart
        db.carts.update_one(
            {"user_id": ObjectId(user_id)},
            {"$set": cart_dict}
        )
        updated_cart = db.carts.find_one({"user_id": ObjectId(user_id)})
    else:
        # Create new cart
        cart_dict["user_id"] = ObjectId(user_id)
        result = db.carts.insert_one(cart_dict)
        updated_cart = db.carts.find_one({"_id": result.inserted_id})
    
    updated_cart["_id"] = str(updated_cart["_id"])
    updated_cart["user_id"] = str(updated_cart["user_id"])
    
    return updated_cart

@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def clear_cart(
    request: Request,
    current_user: TokenData = Depends(get_current_user)
):
    """Clear all items from cart"""
    db = request.app.mongodb
    user_id = get_user_id_from_token(current_user, request)
    
    db.carts.update_one(
        {"user_id": ObjectId(user_id)},
        {"$set": {"items": [], "last_updated": datetime.utcnow()}}
    )
    
    return None

@router.delete("/me/items/{jajanan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_item_from_cart(
    jajanan_id: str,
    request: Request,
    current_user: TokenData = Depends(get_current_user)
):
    """Remove specific item from cart"""
    db = request.app.mongodb
    user_id = get_user_id_from_token(current_user, request)
    
    if not ObjectId.is_valid(jajanan_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid jajanan ID format"
        )
    
    db.carts.update_one(
        {"user_id": ObjectId(user_id)},
        {
            "$pull": {"items": {"jajanan_id": jajanan_id}},
            "$set": {"last_updated": datetime.utcnow()}
        }
    )
    
    return None
