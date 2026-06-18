from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import engine, Base, SessionLocal
from app.core.seed import seed_db
from app.api.v1.router import router as api_router

app = FastAPI(
    title="KitchenIQ AI API",
    description="Backend services for KitchenIQ AI - Inventory & Restaurant Intelligence Platform",
    version="1.0.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    print("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    
    print("Running database seeding check...")
    db = SessionLocal()
    try:
        seed_db(db)
    except Exception as e:
        print(f"Failed to seed database: {e}")
    finally:
        db.close()

@app.get("/")
def read_root():
    return {
        "app": "KitchenIQ AI API",
        "status": "online",
        "version": "1.0.0",
        "docs_url": "/docs"
    }

# Include API Router
app.include_router(api_router, prefix="/api/v1")
