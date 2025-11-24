from fastapi import APIRouter, HTTPException, status, Request, Depends, UploadFile, File
from typing import List, Optional
from bson import ObjectId
from datetime import datetime
from models import PesananCreate, PesananUpdate, PesananResponse
from auth import get_current_user, TokenData
from jose import jwt
import os
from pydantic import BaseModel
import shutil
from pathlib import Path

router = APIRouter()

class UploadBuktiPembayaran(BaseModel):
    bukti_pembayaran_url: str

# Path untuk upload files
UPLOAD_DIR = Path("../Frontend/public/uploads/bukti-pembayaran")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

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

@router.get("/", response_model=List[PesananResponse])
async def get_all_pesanan(
    request: Request,
    status_pesanan: Optional[str] = None,
    current_user: TokenData = Depends(get_current_user)
):
    """Get all orders (admin) or user's orders"""
    db = request.app.mongodb
    user_id = get_user_id_from_token(current_user, request)
    
    # Check if user is admin
    user = db.users.find_one({"_id": ObjectId(user_id)})
    
    query = {}
    if user and user.get("peran") != "admin":
        # Regular user can only see their own orders
        query["pelanggan_id"] = ObjectId(user_id)
    
    if status_pesanan:
        query["status_pesanan"] = status_pesanan
    
    pesanan_list = list(db.pesanan.find(query))
    for pesanan in pesanan_list:
        pesanan["_id"] = str(pesanan["_id"])
        pesanan["pelanggan_id"] = str(pesanan["pelanggan_id"])
        # Convert ObjectId to string in item_pesanan
        for item in pesanan["item_pesanan"]:
            if isinstance(item["jajanan_id"], ObjectId):
                item["jajanan_id"] = str(item["jajanan_id"])
    
    return pesanan_list

@router.get("/{pesanan_id}", response_model=PesananResponse)
async def get_pesanan_by_id(
    pesanan_id: str,
    request: Request,
    current_user: TokenData = Depends(get_current_user)
):
    """Get order by ID"""
    db = request.app.mongodb
    user_id = get_user_id_from_token(current_user, request)
    
    if not ObjectId.is_valid(pesanan_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid pesanan ID format"
        )
    
    pesanan = db.pesanan.find_one({"_id": ObjectId(pesanan_id)})
    
    if not pesanan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pesanan not found"
        )
    
    # Check if user owns this order or is admin
    user = db.users.find_one({"_id": ObjectId(user_id)})
    if user.get("peran") != "admin" and str(pesanan["pelanggan_id"]) != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view this order"
        )
    
    pesanan["_id"] = str(pesanan["_id"])
    pesanan["pelanggan_id"] = str(pesanan["pelanggan_id"])
    # Convert ObjectId to string in item_pesanan
    for item in pesanan["item_pesanan"]:
        if isinstance(item["jajanan_id"], ObjectId):
            item["jajanan_id"] = str(item["jajanan_id"])
    
    return pesanan

@router.post("/", response_model=PesananResponse, status_code=status.HTTP_201_CREATED)
async def create_pesanan(
    pesanan: PesananCreate,
    request: Request,
    current_user: TokenData = Depends(get_current_user)
):
    """Create new order"""
    db = request.app.mongodb
    user_id = get_user_id_from_token(current_user, request)
    
    pesanan_dict = pesanan.model_dump()
    pesanan_dict["pelanggan_id"] = ObjectId(user_id)
    pesanan_dict["tanggal_pesan"] = datetime.utcnow()
    pesanan_dict["status_pesanan"] = "Menunggu Pembayaran"
    
    # Add QRIS URL for payment (static example, bisa diganti dengan generate dynamic QRIS)
    pesanan_dict["pembayaran"]["qris_url"] = "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=QRIS-KUEBASAH-" + user_id[:8]
    
    # Convert string IDs to ObjectId in item_pesanan
    for item in pesanan_dict["item_pesanan"]:
        if isinstance(item["jajanan_id"], str):
            item["jajanan_id"] = ObjectId(item["jajanan_id"])
    
    result = db.pesanan.insert_one(pesanan_dict)
    
    created_pesanan = db.pesanan.find_one({"_id": result.inserted_id})
    created_pesanan["_id"] = str(created_pesanan["_id"])
    created_pesanan["pelanggan_id"] = str(created_pesanan["pelanggan_id"])
    
    # Convert ObjectId back to string in item_pesanan for response
    for item in created_pesanan["item_pesanan"]:
        if isinstance(item["jajanan_id"], ObjectId):
            item["jajanan_id"] = str(item["jajanan_id"])
    
    return created_pesanan

@router.put("/{pesanan_id}", response_model=PesananResponse)
async def update_pesanan(
    pesanan_id: str,
    pesanan_update: PesananUpdate,
    request: Request,
    current_user: TokenData = Depends(get_current_user)
):
    """Update order status or payment (admin only for status changes)"""
    db = request.app.mongodb
    user_id = get_user_id_from_token(current_user, request)
    
    if not ObjectId.is_valid(pesanan_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid pesanan ID format"
        )
    
    # Check if order exists
    pesanan = db.pesanan.find_one({"_id": ObjectId(pesanan_id)})
    if not pesanan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pesanan not found"
        )
    
    # Only update fields that are provided
    update_data = {k: v for k, v in pesanan_update.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No update data provided"
        )
    
    result = db.pesanan.update_one(
        {"_id": ObjectId(pesanan_id)},
        {"$set": update_data}
    )
    
    updated_pesanan = db.pesanan.find_one({"_id": ObjectId(pesanan_id)})
    updated_pesanan["_id"] = str(updated_pesanan["_id"])
    updated_pesanan["pelanggan_id"] = str(updated_pesanan["pelanggan_id"])
    
    # Convert ObjectId to string in item_pesanan
    for item in updated_pesanan["item_pesanan"]:
        if isinstance(item["jajanan_id"], ObjectId):
            item["jajanan_id"] = str(item["jajanan_id"])
    
    return updated_pesanan

@router.delete("/{pesanan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_pesanan(
    pesanan_id: str,
    request: Request,
    current_user: TokenData = Depends(get_current_user)
):
    """Cancel order (set status to 'Batal')"""
    db = request.app.mongodb
    user_id = get_user_id_from_token(current_user, request)
    
    if not ObjectId.is_valid(pesanan_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid pesanan ID format"
        )
    
    pesanan = db.pesanan.find_one({"_id": ObjectId(pesanan_id)})
    
    if not pesanan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pesanan not found"
        )
    
    # Check if user owns this order
    if str(pesanan["pelanggan_id"]) != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to cancel this order"
        )
    
    # Only allow cancellation if order is in "Menunggu Pembayaran" status
    if pesanan["status_pesanan"] not in ["Menunggu Pembayaran", "Diproses"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot cancel order in current status"
        )
    
    db.pesanan.update_one(
        {"_id": ObjectId(pesanan_id)},
        {"$set": {"status_pesanan": "Batal"}}
    )
    
    return None

@router.post("/{pesanan_id}/upload-bukti", response_model=PesananResponse)
async def upload_bukti_pembayaran(
    pesanan_id: str,
    file: UploadFile = File(...),
    request: Request = None,
    current_user: TokenData = Depends(get_current_user)
):
    """Customer uploads payment proof"""
    db = request.app.mongodb
    user_id = get_user_id_from_token(current_user, request)
    
    if not ObjectId.is_valid(pesanan_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid pesanan ID format"
        )
    
    pesanan = db.pesanan.find_one({"_id": ObjectId(pesanan_id)})
    if not pesanan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pesanan not found"
        )
    
    # Check if user owns this order
    if str(pesanan["pelanggan_id"]) != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to upload proof for this order"
        )
    
    # Validate file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )
    
    # Save file
    file_extension = file.filename.split('.')[-1]
    filename = f"bukti_{pesanan_id}.{file_extension}"
    file_path = UPLOAD_DIR / filename
    
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Update database
    bukti_url = f"/uploads/bukti-pembayaran/{filename}"
    db.pesanan.update_one(
        {"_id": ObjectId(pesanan_id)},
        {"$set": {"pembayaran.bukti_pembayaran_url": bukti_url}}
    )
    
    updated_pesanan = db.pesanan.find_one({"_id": ObjectId(pesanan_id)})
    updated_pesanan["_id"] = str(updated_pesanan["_id"])
    updated_pesanan["pelanggan_id"] = str(updated_pesanan["pelanggan_id"])
    for item in updated_pesanan["item_pesanan"]:
        if isinstance(item["jajanan_id"], ObjectId):
            item["jajanan_id"] = str(item["jajanan_id"])
    
    return updated_pesanan

@router.post("/{pesanan_id}/confirm-payment", response_model=PesananResponse)
async def confirm_payment(
    pesanan_id: str,
    request: Request,
    current_user: TokenData = Depends(get_current_user)
):
    """Admin confirms payment received"""
    db = request.app.mongodb
    user_id = get_user_id_from_token(current_user, request)
    
    # Check if user is admin
    user = db.users.find_one({"_id": ObjectId(user_id)})
    if not user or user.get("peran") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can confirm payment"
        )
    
    if not ObjectId.is_valid(pesanan_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid pesanan ID format"
        )
    
    pesanan = db.pesanan.find_one({"_id": ObjectId(pesanan_id)})
    if not pesanan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pesanan not found"
        )
    
    # Update payment status and order status
    db.pesanan.update_one(
        {"_id": ObjectId(pesanan_id)},
        {"$set": {
            "pembayaran.status_pembayaran": "Paid",
            "status_pesanan": "Diproses"
        }}
    )
    
    updated_pesanan = db.pesanan.find_one({"_id": ObjectId(pesanan_id)})
    updated_pesanan["_id"] = str(updated_pesanan["_id"])
    updated_pesanan["pelanggan_id"] = str(updated_pesanan["pelanggan_id"])
    for item in updated_pesanan["item_pesanan"]:
        if isinstance(item["jajanan_id"], ObjectId):
            item["jajanan_id"] = str(item["jajanan_id"])
    
    return updated_pesanan

@router.post("/{pesanan_id}/ship", response_model=PesananResponse)
async def ship_order(
    pesanan_id: str,
    request: Request,
    current_user: TokenData = Depends(get_current_user)
):
    """Admin ships the order"""
    db = request.app.mongodb
    user_id = get_user_id_from_token(current_user, request)
    
    # Check if user is admin
    user = db.users.find_one({"_id": ObjectId(user_id)})
    if not user or user.get("peran") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can ship orders"
        )
    
    if not ObjectId.is_valid(pesanan_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid pesanan ID format"
        )
    
    pesanan = db.pesanan.find_one({"_id": ObjectId(pesanan_id)})
    if not pesanan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pesanan not found"
        )
    
    if pesanan["status_pesanan"] != "Diproses":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only ship orders in 'Diproses' status"
        )
    
    # Update order status to shipped
    db.pesanan.update_one(
        {"_id": ObjectId(pesanan_id)},
        {"$set": {"status_pesanan": "Dikirim"}}
    )
    
    updated_pesanan = db.pesanan.find_one({"_id": ObjectId(pesanan_id)})
    updated_pesanan["_id"] = str(updated_pesanan["_id"])
    updated_pesanan["pelanggan_id"] = str(updated_pesanan["pelanggan_id"])
    for item in updated_pesanan["item_pesanan"]:
        if isinstance(item["jajanan_id"], ObjectId):
            item["jajanan_id"] = str(item["jajanan_id"])
    
    return updated_pesanan

@router.post("/{pesanan_id}/confirm-received", response_model=PesananResponse)
async def confirm_received(
    pesanan_id: str,
    request: Request,
    current_user: TokenData = Depends(get_current_user)
):
    """Customer confirms order received"""
    db = request.app.mongodb
    user_id = get_user_id_from_token(current_user, request)
    
    if not ObjectId.is_valid(pesanan_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid pesanan ID format"
        )
    
    pesanan = db.pesanan.find_one({"_id": ObjectId(pesanan_id)})
    if not pesanan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pesanan not found"
        )
    
    # Check if user owns this order
    if str(pesanan["pelanggan_id"]) != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to confirm this order"
        )
    
    if pesanan["status_pesanan"] != "Dikirim":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only confirm orders in 'Dikirim' status"
        )
    
    # Update order status to completed
    db.pesanan.update_one(
        {"_id": ObjectId(pesanan_id)},
        {"$set": {"status_pesanan": "Selesai"}}
    )
    
    updated_pesanan = db.pesanan.find_one({"_id": ObjectId(pesanan_id)})
    updated_pesanan["_id"] = str(updated_pesanan["_id"])
    updated_pesanan["pelanggan_id"] = str(updated_pesanan["pelanggan_id"])
    for item in updated_pesanan["item_pesanan"]:
        if isinstance(item["jajanan_id"], ObjectId):
            item["jajanan_id"] = str(item["jajanan_id"])
    
    return updated_pesanan
