from fastapi import APIRouter, HTTPException, status, Request, Depends, UploadFile, File
from typing import List, Optional
from bson import ObjectId
from models import JajananCreate, JajananUpdate, JajananResponse
from auth import get_current_user, TokenData
import shutil
from pathlib import Path

router = APIRouter()

# Path untuk upload files
UPLOAD_DIR = Path("../Frontend/public/uploads/jajanan")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@router.get("/", response_model=List[JajananResponse])
async def get_all_jajanan(
    request: Request,
    status_ketersediaan: Optional[str] = None
):
    """Get all jajanan/products, optionally filter by availability status"""
    db = request.app.mongodb
    
    query = {}
    if status_ketersediaan:
        query["status_ketersediaan"] = status_ketersediaan
    
    jajanan_list = list(db.jajanan.find(query))
    for jajanan in jajanan_list:
        jajanan["_id"] = str(jajanan["_id"])
    
    return jajanan_list

@router.get("/{jajanan_id}", response_model=JajananResponse)
async def get_jajanan_by_id(jajanan_id: str, request: Request):
    """Get jajanan/product by ID"""
    db = request.app.mongodb
    
    if not ObjectId.is_valid(jajanan_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid jajanan ID format"
        )
    
    jajanan = db.jajanan.find_one({"_id": ObjectId(jajanan_id)})
    if not jajanan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Jajanan not found"
        )
    
    jajanan["_id"] = str(jajanan["_id"])
    return jajanan

@router.post("/", response_model=JajananResponse, status_code=status.HTTP_201_CREATED)
async def create_jajanan(
    jajanan: JajananCreate,
    request: Request,
    current_user: TokenData = Depends(get_current_user)
):
    """Create new jajanan/product (admin only)"""
    db = request.app.mongodb
    
    jajanan_dict = jajanan.model_dump()
    result = db.jajanan.insert_one(jajanan_dict)
    
    created_jajanan = db.jajanan.find_one({"_id": result.inserted_id})
    created_jajanan["_id"] = str(created_jajanan["_id"])
    
    return created_jajanan

@router.put("/{jajanan_id}", response_model=JajananResponse)
async def update_jajanan(
    jajanan_id: str,
    jajanan_update: JajananUpdate,
    request: Request,
    current_user: TokenData = Depends(get_current_user)
):
    """Update jajanan/product (admin only)"""
    db = request.app.mongodb
    
    if not ObjectId.is_valid(jajanan_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid jajanan ID format"
        )
    
    # Only update fields that are provided
    update_data = {k: v for k, v in jajanan_update.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No update data provided"
        )
    
    result = db.jajanan.update_one(
        {"_id": ObjectId(jajanan_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Jajanan not found"
        )
    
    updated_jajanan = db.jajanan.find_one({"_id": ObjectId(jajanan_id)})
    updated_jajanan["_id"] = str(updated_jajanan["_id"])
    
    return updated_jajanan

@router.delete("/{jajanan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_jajanan(
    jajanan_id: str,
    request: Request,
    current_user: TokenData = Depends(get_current_user)
):
    """Delete jajanan/product (admin only)"""
    db = request.app.mongodb
    
    if not ObjectId.is_valid(jajanan_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid jajanan ID format"
        )
    
    result = db.jajanan.delete_one({"_id": ObjectId(jajanan_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Jajanan not found"
        )
    
    return None

@router.post("/{jajanan_id}/upload-foto", response_model=JajananResponse)
async def upload_foto_jajanan(
    jajanan_id: str,
    file: UploadFile = File(...),
    request: Request = None,
    current_user: TokenData = Depends(get_current_user)
):
    """Upload product photo (admin only)"""
    db = request.app.mongodb
    
    if not ObjectId.is_valid(jajanan_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid jajanan ID format"
        )
    
    jajanan = db.jajanan.find_one({"_id": ObjectId(jajanan_id)})
    if not jajanan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Jajanan not found"
        )
    
    # Validate file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )
    
    # Save file
    file_extension = file.filename.split('.')[-1]
    filename = f"jajanan_{jajanan_id}.{file_extension}"
    file_path = UPLOAD_DIR / filename
    
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Update database
    foto_url = f"/uploads/jajanan/{filename}"
    db.jajanan.update_one(
        {"_id": ObjectId(jajanan_id)},
        {"$set": {"foto_url": foto_url}}
    )
    
    updated_jajanan = db.jajanan.find_one({"_id": ObjectId(jajanan_id)})
    updated_jajanan["_id"] = str(updated_jajanan["_id"])
    
    return updated_jajanan
