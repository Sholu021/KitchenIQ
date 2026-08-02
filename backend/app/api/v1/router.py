from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.products import router as products_router
from app.api.v1.suppliers import router as suppliers_router
from app.api.v1.purchase_orders import router as purchase_orders_router
from app.api.v1.batches import router as batches_router
from app.api.v1.recipes import router as recipes_router
from app.api.v1.sales import router as sales_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.ai import router as ai_router
from app.api.v1.wastage import router as wastage_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.users import router as users_router
from app.api.v1.production import router as production_router
from app.api.v1.export import router as export_router
from app.api.v1.scheduled_reports import (
    router as scheduled_reports_router,
)
from app.api.v1.notifications import (
    router as notifications_router,
)
from app.api.v1.audit import router as audit_router


router = APIRouter()

router.include_router(auth_router)
router.include_router(products_router)
router.include_router(suppliers_router)
router.include_router(purchase_orders_router)
router.include_router(batches_router)
router.include_router(recipes_router)
router.include_router(sales_router)
router.include_router(dashboard_router)
router.include_router(ai_router)
router.include_router(wastage_router)
router.include_router(analytics_router)
router.include_router(users_router)
router.include_router(production_router)
router.include_router(export_router)
router.include_router(scheduled_reports_router)
router.include_router(notifications_router)
router.include_router(audit_router)