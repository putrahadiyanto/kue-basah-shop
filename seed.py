import os, sys
from datetime import datetime, timedelta
import pymongo
from bson.objectid import ObjectId
from dotenv import load_dotenv
from passlib.context import CryptContext

# Password hashing context (same as in auth.py)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return pwd_context.hash(password)

def connect_to_db():

    print("Loading environment variables from .env file")
    # Load .env from Backend folder
    import os
    backend_env_path = os.path.join(os.path.dirname(__file__), 'Backend', '.env')
    load_dotenv(backend_env_path)

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
            "email": "admin@jajanan.com",
            "password_hash": hash_password("admin123"),
            "peran": "admin",
            "alamat": []
        },
        {
            "nama_lengkap": "Siti Nurhaliza",
            "email": "siti@example.com",
            "password_hash": hash_password("password123"),
            "peran": "pelanggan",
            "alamat": [
                {"jalan": "Jl. Melati 5", "kota": "Bandung", "kode_pos": "40123"}
            ]
        }
    ]
    user_result = db.users.insert_many(users)
    inserted_user_ids = user_result.inserted_ids
    print(f"Inserted users: {inserted_user_ids}")
    print("  - Email: budi@example.com, Password: password123 (pelanggan)")
    print("  - Email: admin@jajanan.com, Password: admin123 (admin)")
    print("  - Email: siti@example.com, Password: password123 (pelanggan)")

    # 2) Insert sample jajanan (products)
    jajanan_items = [
        {
            "nama": "Kue Lapis",
            "deskripsi": "Kue lapis legit berlapis-lapis dengan rasa manis dan tekstur lembut. Dibuat dengan bahan premium seperti mentega, telur, dan rempah pilihan. Cocok untuk acara spesial atau sebagai oleh-oleh khas.",
            "harga": 25000,
            "satuan": "per loyang",
            "status_ketersediaan": "pre_order",
            "waktu_preorder_hari": 3,
            "foto_url": "https://picsum.photos/seed/kue-lapis/300/200"
        },
        {
            "nama": "Onde-onde",
            "deskripsi": "Kue tradisional berbentuk bulat dengan isian kacang hijau manis. Dilapisi wijen dan digoreng hingga renyah di luar namun lembut di dalam. Nikmat disajikan hangat atau dingin.",
            "harga": 5000,
            "satuan": "per buah",
            "status_ketersediaan": "ready_stok",
            "waktu_preorder_hari": 0,
            "foto_url": "https://picsum.photos/seed/onde-onde/300/200"
        },
        {
            "nama": "Lemper",
            "deskripsi": "Ketan lembut berisi abon ayam atau sapi yang gurih, dibungkus daun pisang. Camilan tradisional yang mengenyangkan dan penuh cita rasa. Cocok untuk sarapan atau camilan sore.",
            "harga": 3000,
            "satuan": "per buah",
            "status_ketersediaan": "ready_stok",
            "waktu_preorder_hari": 0,
            "foto_url": "https://picsum.photos/seed/lemper/300/200"
        },
        {
            "nama": "Martabak Telur",
            "deskripsi": "Martabak dengan isian telur, daging cincang, dan sayuran segar. Kulit yang renyah dengan isian melimpah. Disajikan dengan saus cuka dan sambal untuk pengalaman rasa yang sempurna.",
            "harga": 20000,
            "satuan": "per buah",
            "status_ketersediaan": "pre_order",
            "waktu_preorder_hari": 2,
            "foto_url": "https://picsum.photos/seed/martabak/300/200"
        },
        {
            "nama": "Risoles",
            "deskripsi": "Risoles isi sayuran, daging ayam, dan telur. Dibalut kulit tipis dan dilapisi tepung roti lalu digoreng garing. Renyah di luar dengan isian yang creamy dan gurih di dalam.",
            "harga": 4000,
            "satuan": "per buah",
            "status_ketersediaan": "ready_stok",
            "waktu_preorder_hari": 0,
            "foto_url": "https://picsum.photos/seed/risoles/300/200"
        },
        {
            "nama": "Kue Putu",
            "deskripsi": "Kue putu bambu tradisional dengan isian gula merah yang manis dan parutan kelapa segar. Dikukus dalam bambu untuk aroma khas yang autentik. Lembut dan harum pandan.",
            "harga": 2000,
            "satuan": "per buah",
            "status_ketersediaan": "ready_stok",
            "waktu_preorder_hari": 0,
            "foto_url": "https://picsum.photos/seed/putu/300/200"
        }
    ]
    jajanan_result = db.jajanan.insert_many(jajanan_items)
    inserted_jajanan_ids = jajanan_result.inserted_ids
    print(f"Inserted {len(inserted_jajanan_ids)} jajanan products")

    # 2a) Insert sample reviews into `ulasan` collection (separate collection)
    ulasan_docs = [
        {
            "jajanan_id": str(inserted_jajanan_ids[0]),
            "user_id": str(inserted_user_ids[0]),
            "rating": 5,
            "komentar": "Enak sekali! Kue lapisnya lembut dan manis pas.",
            "tanggal": datetime.utcnow()
        },
        {
            "jajanan_id": str(inserted_jajanan_ids[1]),
            "user_id": str(inserted_user_ids[0]),
            "rating": 4,
            "komentar": "Onde-ondenya renyah di luar, lembut di dalam. Recommended!",
            "tanggal": datetime.utcnow(),
            "foto_url": "https://picsum.photos/seed/review-onde/200/150"
        },
        {
            "jajanan_id": str(inserted_jajanan_ids[2]),
            "user_id": str(inserted_user_ids[2]),
            "rating": 5,
            "komentar": "Lemper isinya banyak, sangat puas!",
            "tanggal": datetime.utcnow()
        },
        {
            "jajanan_id": str(inserted_jajanan_ids[3]),
            "user_id": str(inserted_user_ids[2]),
            "rating": 5,
            "komentar": "Martabaknya enak banget, isinya penuh!",
            "tanggal": datetime.utcnow()
        }
    ]
    ulasan_result = db.ulasan.insert_many(ulasan_docs)
    print(f"Inserted {len(ulasan_result.inserted_ids)} ulasan/reviews")

    # 3) Insert a sample cart for the first user
    cart = {
        "user_id": str(inserted_user_ids[0]),
        "items": [
            {"jajanan_id": str(inserted_jajanan_ids[0]), "qty": 1, "harga_satuan": jajanan_items[0]["harga"]},
            {"jajanan_id": str(inserted_jajanan_ids[1]), "qty": 6, "harga_satuan": jajanan_items[1]["harga"]}
        ],
        "last_updated": datetime.utcnow()
    }
    cart_result = db.carts.insert_one(cart)
    print(f"Inserted sample cart")

    # 4) Insert sample pesanan (orders)
    tanggal_pesan = datetime.utcnow()
    tanggal_pengiriman_diminta = tanggal_pesan + timedelta(days=3)

    pembayaran1 = {
        "metode": "Transfer Bank",
        "status_pembayaran": "Pending",
        "ongkos_kirim": 10000,
        "total_pembayaran": jajanan_items[0]["harga"] * 1 + jajanan_items[1]["harga"] * 6 + 10000
    }

    pesanan1 = {
        "pelanggan_id": str(inserted_user_ids[0]),
        "tanggal_pesan": tanggal_pesan,
        "tanggal_pengiriman_diminta": tanggal_pengiriman_diminta,
        "status_pesanan": "Menunggu Pembayaran",
        "item_pesanan": [
            {"jajanan_id": str(inserted_jajanan_ids[0]), "qty": 1, "harga_satuan": jajanan_items[0]["harga"]},
            {"jajanan_id": str(inserted_jajanan_ids[1]), "qty": 6, "harga_satuan": jajanan_items[1]["harga"]}
        ],
        "alamat_pengiriman": {
            "nama_penerima": "Budi Santoso",
            "telepon_penerima": "081234567890",
            "jalan": "Jl. Mawar 1",
            "kota": "Jakarta"
        },
        "pembayaran": pembayaran1
    }

    pembayaran2 = {
        "metode": "COD",
        "status_pembayaran": "Paid",
        "ongkos_kirim": 15000,
        "total_pembayaran": jajanan_items[3]["harga"] * 2 + jajanan_items[4]["harga"] * 5 + 15000
    }

    pesanan2 = {
        "pelanggan_id": str(inserted_user_ids[2]),
        "tanggal_pesan": tanggal_pesan - timedelta(days=1),
        "tanggal_pengiriman_diminta": tanggal_pengiriman_diminta - timedelta(days=1),
        "status_pesanan": "Diproses",
        "item_pesanan": [
            {"jajanan_id": str(inserted_jajanan_ids[3]), "qty": 2, "harga_satuan": jajanan_items[3]["harga"]},
            {"jajanan_id": str(inserted_jajanan_ids[4]), "qty": 5, "harga_satuan": jajanan_items[4]["harga"]}
        ],
        "alamat_pengiriman": {
            "nama_penerima": "Siti Nurhaliza",
            "telepon_penerima": "082345678901",
            "jalan": "Jl. Melati 5",
            "kota": "Bandung"
        },
        "pembayaran": pembayaran2
    }

    pesanan_result = db.pesanan.insert_many([pesanan1, pesanan2])
    print(f"Inserted {len(pesanan_result.inserted_ids)} sample orders")

    print("\n Database seeding completed successfully!")
    print("\n Test Accounts:")
    print("   Admin: admin@jajanan.com / admin123")
    print("   User 1: budi@example.com / password123")
    print("   User 2: siti@example.com / password123")


if __name__ == "__main__":
    db = connect_to_db()
    seed_db(db)

