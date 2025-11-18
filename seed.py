import os, sys
import hashlib
from datetime import datetime, timedelta
import pymongo
from bson.objectid import ObjectId
from dotenv import load_dotenv

def connect_to_db():

    print("Loading environment variables from .env file")
    load_dotenv()

    CONNECTION_STRING = os.getenv('CONNECTION_STRING')
    DATABASE_NAME = os.getenv('DATABASE_NAME')
    if not CONNECTION_STRING or not DATABASE_NAME:
        print("Error: CONNECTION_STRING or DATABASE_NAME not found in environment variables.")
        sys.exit(1)
    else :
        print("Environment variables loaded successfully.")

    print("Connecting to MongoDB...")
    client = pymongo.MongoClient(CONNECTION_STRING)
    db = client[DATABASE_NAME]
    print("Connected to MongoDB.")
    return db

def seed_db(db):

    print("Seeding the database...")
    # Clear existing collections (safe for development/seeding)
    for coll in ("users", "jajanan", "carts", "pesanan", "ulasan"):
        if coll in db.list_collection_names():
            db[coll].delete_many({})

    # Helper to create a simple password hash (sha256 for sample/demo)
    def hash_password(password: str) -> str:
        return hashlib.sha256(password.encode("utf-8")).hexdigest()

    # 1) Insert sample users
    users = [
        {
            "nama_lengkap": "Budi Santoso",
            "email": "budi@example.com",
            "password_hash": hash_password("password123"),
            "peran": "pelanggan",
            "alamat": [
                {"jalan": "Jl. Mawar 1", "kota": "Jakarta", "kode_pos": "12345"}
            ]
        },
        {
            "nama_lengkap": "Admin Toko",
            "email": "admin@example.com",
            "password_hash": hash_password("password123"),
            "peran": "admin",
            "alamat": []
        }
    ]
    user_result = db.users.insert_many(users)
    inserted_user_ids = user_result.inserted_ids
    print(f"Inserted users: {inserted_user_ids}")

    # 2) Insert sample jajanan (products)
    jajanan_items = [
        {
            "nama": "Kue Lapis",
            "harga": 25000,
            "satuan": "per loyang",
            "status_ketersediaan": "pre_order",
            "waktu_preorder_hari": 3,
            "foto_url": "https://example.com/images/kue-lapis.jpg"
        },
        {
            "nama": "Onde-onde",
            "harga": 5000,
            "satuan": "per buah",
            "status_ketersediaan": "ready_stok",
            "waktu_preorder_hari": 0,
            "foto_url": "https://example.com/images/onde-onde.jpg"
        }
    ]
    jajanan_result = db.jajanan.insert_many(jajanan_items)
    inserted_jajanan_ids = jajanan_result.inserted_ids
    print(f"Inserted jajanan: {inserted_jajanan_ids}")

    # 2a) Insert sample reviews into `ulasan` collection (separate collection)
    ulasan_docs = [
        {
            "jajanan_id": inserted_jajanan_ids[0],
            "user_id": inserted_user_ids[0],
            "rating": 5,
            "komentar": "Enak sekali!",
            "tanggal": datetime.utcnow()
        },
        {
            "jajanan_id": inserted_jajanan_ids[1],
            "user_id": inserted_user_ids[0],
            "rating": 4,
            "komentar": "Renyah dan manis",
            "tanggal": datetime.utcnow(),
            "foto_url": "https://example.com/images/review-onde-onde.jpg"
        }
    ]
    ulasan_result = db.ulasan.insert_many(ulasan_docs)
    print(f"Inserted ulasan: {ulasan_result.inserted_ids}")

    # 3) Insert a sample cart for the first user
    cart = {
        "user_id": inserted_user_ids[0],
        "items": [
            {"jajanan_id": inserted_jajanan_ids[0], "qty": 1, "harga_satuan": jajanan_items[0]["harga"]},
            {"jajanan_id": inserted_jajanan_ids[1], "qty": 6, "harga_satuan": jajanan_items[1]["harga"]}
        ],
        "last_updated": datetime.utcnow()
    }
    cart_result = db.carts.insert_one(cart)
    print(f"Inserted cart id: {cart_result.inserted_id}")

    # 4) Insert a sample pesanan (order) for the first user
    tanggal_pesan = datetime.utcnow()
    tanggal_pengiriman_diminta = tanggal_pesan + timedelta(days=3)

    pembayaran = {
        "metode": "Transfer Bank",
        "status_pembayaran": "Pending",
        "ongkos_kirim": 10000,
        "total_pembayaran": jajanan_items[0]["harga"] * 1 + jajanan_items[1]["harga"] * 6 + 10000
    }

    pesanan = {
        "pelanggan_id": inserted_user_ids[0],
        "tanggal_pesan": tanggal_pesan,
        "tanggal_pengiriman_diminta": tanggal_pengiriman_diminta,
        "status_pesanan": "Menunggu Pembayaran",
        "item_pesanan": [
            {"jajanan_id": inserted_jajanan_ids[0], "qty": 1, "harga_satuan": jajanan_items[0]["harga"]},
            {"jajanan_id": inserted_jajanan_ids[1], "qty": 6, "harga_satuan": jajanan_items[1]["harga"]}
        ],
        "alamat_pengiriman": {
            "nama_penerima": "Budi Santoso",
            "telepon_penerima": "081234567890",
            "jalan": "Jl. Mawar 1",
            "kota": "Jakarta"
        },
        "pembayaran": pembayaran
    }

    pesanan_result = db.pesanan.insert_one(pesanan)
    print(f"Inserted pesanan id: {pesanan_result.inserted_id}")

    print("Database seeding completed.")


if __name__ == "__main__":
    db = connect_to_db()
    seed_db(db)

