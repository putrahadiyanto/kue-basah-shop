from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List
from datetime import datetime
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, info=None):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, field_schema):
        field_schema.update(type="string")

# ===== User Models =====
class Alamat(BaseModel):
    jalan: str
    kota: str
    kode_pos: Optional[str] = None

class UserBase(BaseModel):
    nama_lengkap: str
    email: EmailStr
    peran: str = "pelanggan"  # pelanggan atau admin
    alamat: List[Alamat] = []

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: str = Field(alias="_id")
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

# ===== Jajanan Models =====
class JajananBase(BaseModel):
    nama: str
    deskripsi: str
    harga: int
    satuan: str
    status_ketersediaan: str  # pre_order atau ready_stok
    waktu_preorder_hari: int
    foto_url: Optional[str] = None

class JajananCreate(JajananBase):
    pass

class JajananUpdate(BaseModel):
    nama: Optional[str] = None
    deskripsi: Optional[str] = None
    harga: Optional[int] = None
    satuan: Optional[str] = None
    status_ketersediaan: Optional[str] = None
    waktu_preorder_hari: Optional[int] = None
    foto_url: Optional[str] = None

class JajananResponse(JajananBase):
    id: str = Field(alias="_id")
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

# ===== Ulasan Models =====
class UlasanBase(BaseModel):
    jajanan_id: str
    rating: int = Field(ge=1, le=5)
    komentar: str
    foto_url: Optional[str] = None

class UlasanCreate(UlasanBase):
    pass

class UlasanResponse(UlasanBase):
    id: str = Field(alias="_id")
    user_id: str
    tanggal: datetime
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

# ===== Cart Models =====
class CartItem(BaseModel):
    jajanan_id: str
    qty: int
    harga_satuan: int

class CartBase(BaseModel):
    items: List[CartItem] = []

class CartCreate(CartBase):
    pass

class CartUpdate(BaseModel):
    items: List[CartItem]

class CartResponse(CartBase):
    id: str = Field(alias="_id")
    user_id: str
    last_updated: datetime
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

# ===== Pesanan Models =====
class AlamatPengiriman(BaseModel):
    nama_penerima: str
    telepon_penerima: str
    jalan: str
    kota: str

class Pembayaran(BaseModel):
    metode: str
    status_pembayaran: str  # Pending, Paid, Failed, Expired
    ongkos_kirim: int
    total_pembayaran: int

class ItemPesanan(BaseModel):
    jajanan_id: str
    qty: int
    harga_satuan: int

class PesananBase(BaseModel):
    tanggal_pengiriman_diminta: datetime
    item_pesanan: List[ItemPesanan]
    alamat_pengiriman: AlamatPengiriman
    pembayaran: Pembayaran

class PesananCreate(PesananBase):
    pass

class PesananUpdate(BaseModel):
    status_pesanan: Optional[str] = None
    pembayaran: Optional[Pembayaran] = None

class PesananResponse(PesananBase):
    id: str = Field(alias="_id")
    pelanggan_id: str
    tanggal_pesan: datetime
    status_pesanan: str
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

# ===== Token Models =====
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
