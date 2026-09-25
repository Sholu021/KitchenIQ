import logging
import os

logger = logging.getLogger(__name__)

from dotenv import load_dotenv

from sqlalchemy import text

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.audit import router as audit_router
from app.routes.analytics import router as analytics_router

from app.core.logging import setup_logging
from app.core.exceptions import register_exception_handlers
from app.core.database import engine, Base, SessionLocal, DATABASE_URL
from app.core.seed import seed_db
from app.core.rate_limit import limiter

from app.api.v1.router import router as api_router
from app.models.billing import BillingSubscription

from app.services.scheduler_service import scheduler as report_scheduler

from app.scheduler.ceo_scheduler import scheduler as ceo_scheduler
from app.scheduler.inventory_scheduler import scheduler as inventory_scheduler
from app.scheduler.reorder_scheduler import scheduler as reorder_scheduler

from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi import _rate_limit_exceeded_handler

load_dotenv()
setup_logging()

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):

    logger.info("========== REGISTERED ROUTES ==========")

    for route in app.routes:
        if hasattr(route, "methods"):
            logger.info("%s %s", route.path, route.methods)

    logger.info("Initializing database tables...")

    logger.info("=" * 80)
    logger.info("TABLES: %s", list(Base.metadata.tables.keys()))
    logger.info("=" * 80)

    Base.metadata.create_all(bind=engine)

    logger.info(
        "Registered tables: %s",
        list(Base.metadata.tables.keys()),
    )

    logger.info("Running database seeding check...")

    db = SessionLocal()

    try:
        seed_db(db)
    except Exception:
        logger.exception("Database seeding failed")
    finally:
        db.close()

    report_scheduler.start()
    logger.info("Report Scheduler started.")

    ceo_scheduler.start()
    logger.info("CEO Scheduler started.")

    inventory_scheduler.start()
    logger.info("Inventory Scheduler started.")

    reorder_scheduler.start()
    logger.info("AI Reorder Scheduler started.")

    yield

    report_scheduler.shutdown(wait=False)
    ceo_scheduler.shutdown(wait=False)
    inventory_scheduler.shutdown(wait=False)
    reorder_scheduler.shutdown(wait=False)

    logger.info("Schedulers stopped.")
    
app = FastAPI(
    title="KitchenIQ AI API",
    description="Backend services for KitchenIQ AI - Inventory & Restaurant Intelligence Platform",
    version="1.0.0",
    lifespan=lifespan,
)

register_exception_handlers(app)
app.state.limiter = limiter

app.add_exception_handler(
    RateLimitExceeded,
    _rate_limit_exceeded_handler,
)

app.add_middleware(SlowAPIMiddleware)

# Enable CORS for frontend integration
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://kitcheniq-frontend.vercel.app",
]

env_origins = os.getenv("ALLOWED_ORIGINS")

if env_origins:
    origins.extend(
        [
            origin.strip()
            for origin in env_origins.split(",")
            if origin.strip()
        ]
    )

# Remove duplicates while preserving order
origins = list(dict.fromkeys(origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {
        "app": "KitchenIQ AI API",
        "status": "online",
        "version": "1.0.0",
        "docs_url": "/docs"
    }

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "KitchenIQ API",
        "version": "1.0.0"
    }

# Include API Router
app.include_router(api_router, prefix="/api/v1")

app.include_router(
    analytics_router,
    prefix="/api/v1",
)

app.include_router(
    audit_router,
    prefix="/api/v1",
)

@app.get("/db-debug")
def db_debug():
    with engine.connect() as conn:
        tables = conn.execute(text("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema='public'
        """)).fetchall()

    return {
        "database": DATABASE_URL.split("@")[-1],  # hides username/password
        "tables": [t[0] for t in tables]
    }


