import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.audit import router as audit_router
from app.routes.analytics import router as analytics_router
from app.core.logging import setup_logging
from app.core.exceptions import register_exception_handlers
from app.core.rate_limit import limiter
from app.api.v1.router import router as api_router

from app.services.scheduler_service import scheduler as report_scheduler
from app.scheduler.ceo_scheduler import scheduler as ceo_scheduler
from app.scheduler.inventory_scheduler import scheduler as inventory_scheduler
from app.scheduler.reorder_scheduler import scheduler as reorder_scheduler

from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi import _rate_limit_exceeded_handler

load_dotenv()
setup_logging()

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("========== REGISTERED ROUTES ==========")
    for route in app.routes:
        if hasattr(route, "methods"):
            logger.info("%s %s", route.path, route.methods)

    # Database schema changes are managed explicitly through Alembic migrations.
    # Demo data seeding is intentionally not part of application startup.
    #
    # Schedulers run in-process, so they must be explicitly enabled only on a
    # single backend worker/instance. Leaving them disabled by default prevents
    # duplicate jobs when the API is horizontally scaled.
    schedulers_enabled = os.getenv("ENABLE_SCHEDULERS", "").strip().lower() == "true"
    if schedulers_enabled:
        report_scheduler.start()
        ceo_scheduler.start()
        inventory_scheduler.start()
        reorder_scheduler.start()
        logger.info("Background schedulers enabled.")
    else:
        logger.info("Background schedulers disabled.")

    yield

    if schedulers_enabled:
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

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://kitcheniq-frontend.vercel.app",
]

env_origins = os.getenv("ALLOWED_ORIGINS")
if env_origins:
    origins.extend(
        origin.strip()
        for origin in env_origins.split(",")
        if origin.strip()
    )

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
        "docs_url": "/docs",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "KitchenIQ API",
        "version": "1.0.0",
    }


app.include_router(api_router, prefix="/api/v1")
app.include_router(analytics_router, prefix="/api/v1")
app.include_router(audit_router, prefix="/api/v1")
