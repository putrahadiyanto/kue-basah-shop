from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from routers import users, jajanan, carts, pesanan, ulasan, auth
from database import connect_to_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Connect to database
    app.mongodb = connect_to_db()
    print(" Connected to MongoDB")
    yield
    # Shutdown: Close database connection
    app.mongodb.client.close()
    print("❌ Disconnected from MongoDB")

app = FastAPI(
    title="Kue Basah Shop API",
    description="API untuk toko kue basah dengan MongoDB",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware untuk mengizinkan request dari frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(jajanan.router, prefix="/api/jajanan", tags=["Jajanan"])
app.include_router(carts.router, prefix="/api/carts", tags=["Carts"])
app.include_router(pesanan.router, prefix="/api/pesanan", tags=["Pesanan"])
app.include_router(ulasan.router, prefix="/api/ulasan", tags=["Ulasan"])

@app.get("/")
async def root():
    return {
        "message": "Selamat datang di Kue Basah Shop API",
        "docs": "/docs",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "database": "connected"}
