from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
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

# Configure CORS via environment variables so frontend on other devices can access the API.
# Development default: allow all origins. For production set ALLOW_ALL_ORIGINS=false
# and set ALLOWED_ORIGINS to a comma-separated list (e.g. http://localhost:3000,http://192.168.1.4:3000)
allow_all = os.getenv('ALLOW_ALL_ORIGINS', 'true').lower() == 'true'
allowed_origins_env = os.getenv('ALLOWED_ORIGINS', '')
if allow_all:
    origins = ["*"]
else:
    origins = [o.strip() for o in allowed_origins_env.split(',') if o.strip()]
    if 'http://localhost:3000' not in origins:
        origins.append('http://localhost:3000')

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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
