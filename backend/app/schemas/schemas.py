import re
from pydantic import field_validator

from datetime import date, datetime
from typing import List, Optional, Any
from pydantic import BaseModel, EmailStr, Field, ConfigDict

# Helper configuration
class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# --- Authentication & Organizations ---

class OrganizationBase(BaseSchema):
    name: str

class OrganizationCreate(OrganizationBase):
    pass

class OrganizationOut(OrganizationBase):
    id: int
    subscription_tier: str
    subscription_status: str
    subscription_expires_at: Optional[datetime] = None
    created_at: datetime


class SubscriptionUpgradeRequest(BaseSchema):
    tier: str


class OrganizationDetailsOut(BaseSchema):
    id: int
    name: str
    subscription_tier: str
    subscription_status: str
    subscription_expires_at: Optional[datetime] = None
    created_at: datetime
    products_count: int
    products_limit: Optional[int] = None
    recipes_count: int
    recipes_limit: Optional[int] = None
    batches_count: int
    batches_limit: Optional[int] = None


class UserBase(BaseSchema):
    email: EmailStr
    full_name: str
    role: str  # Owner, Manager, Staff
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseSchema):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None

class UserOut(UserBase):
    id: int
    organization_id: int
    created_at: datetime


class RegisterOrgOwnerRequest(BaseSchema):
    organization_name: str
    owner_name: str
    owner_email: EmailStr
    owner_password: str
@field_validator("owner_password")
@classmethod
def validate_password(cls, value: str):
    if len(value) < 8:
        raise ValueError("Password must be at least 8 characters long.")

    if not re.search(r"[A-Z]", value):
        raise ValueError("Password must contain at least one uppercase letter.")

    if not re.search(r"[a-z]", value):
        raise ValueError("Password must contain at least one lowercase letter.")

    if not re.search(r"\d", value):
        raise ValueError("Password must contain at least one digit.")

    return value

class LoginRequest(BaseSchema):
    email: EmailStr
    password: str

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class Token(BaseSchema):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str
    organization_id: int
    user_name: str


# --- Categories & Products ---

class CategoryBase(BaseSchema):
    name: str

class CategoryCreate(CategoryBase):
    pass

class CategoryOut(CategoryBase):
    id: int
    organization_id: int


class ProductBase(BaseSchema):
    name: str
    sku: Optional[str] = None
    unit: str
    reorder_level: float = 0.0
    cost_price: float = 0.0
    selling_price: float = 0.0
    category_id: Optional[int] = None

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseSchema):
    name: Optional[str] = None
    sku: Optional[str] = None
    unit: Optional[str] = None
    reorder_level: Optional[float] = None
    cost_price: Optional[float] = None
    selling_price: Optional[float] = None
    category_id: Optional[int] = None

class ProductOut(ProductBase):
    id: int
    organization_id: int
    current_stock: float
    created_at: datetime
    category: Optional[CategoryOut] = None


class ProductListResponse(BaseSchema):
    total: int
    skip: int
    limit: int
    items: List[ProductOut]


# --- Inventory Transactions ---

class InventoryTransactionBase(BaseSchema):
    product_id: int
    transaction_type: str  # STOCK_IN, STOCK_OUT, ADJUSTMENT
    quantity: float
    notes: Optional[str] = None

class InventoryTransactionCreate(InventoryTransactionBase):
    pass

class InventoryTransactionOut(InventoryTransactionBase):
    id: int
    organization_id: int
    created_at: datetime


# --- Suppliers ---

class SupplierBase(BaseSchema):
    name: str
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None

class SupplierCreate(SupplierBase):
    pass

class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None

class SupplierOut(SupplierBase):
    id: int
    organization_id: int


# --- Purchase Orders ---

class PurchaseOrderItemBase(BaseSchema):
    product_id: int
    quantity: float
    unit_price: float
    batch_number: Optional[str] = None
    expiry_date: Optional[date] = None

class PurchaseOrderItemCreate(PurchaseOrderItemBase):
    pass

class PurchaseOrderItemOut(PurchaseOrderItemBase):
    id: int
    purchase_order_id: int
    product: Optional[ProductOut] = None

class PurchaseOrderBase(BaseSchema):
    supplier_id: int

class PurchaseOrderCreate(PurchaseOrderBase):
    items: List[PurchaseOrderItemCreate]

class PurchaseOrderOut(BaseSchema):
    id: int
    organization_id: int
    supplier_id: int
    status: str  # PENDING, SENT, RECEIVED, CANCELLED
    total_amount: float
    created_at: datetime
    supplier: Optional[SupplierOut] = None
    items: List[PurchaseOrderItemOut] = []

class PurchaseOrderStatusUpdate(BaseSchema):
    status: str  # PENDING, SENT, RECEIVED, CANCELLED


# --- Batches ---

class BatchBase(BaseSchema):
    product_id: int
    batch_number: str
    expiry_date: Optional[date] = None
    quantity: float


class BatchCreate(BatchBase):
    pass


class BatchOut(BatchBase):
    id: int
    organization_id: int
    created_at: datetime
    remaining_quantity: float      # <-- ADD THIS
    product: Optional[ProductOut] = None

class BatchAdjustment(BaseSchema):
    product_id: int
    quantity: float
    transaction_type: str  # STOCK_IN, STOCK_OUT
    notes: Optional[str] = None
    batch_number: Optional[str] = None
    expiry_date: Optional[date] = None


# --- Recipes ---

class RecipeIngredientBase(BaseSchema):
    product_id: int
    quantity_required: float

class RecipeIngredientCreate(RecipeIngredientBase):
    pass

class RecipeIngredientOut(RecipeIngredientBase):
    id: int
    recipe_id: int
    product: Optional[ProductOut] = None

class RecipeBase(BaseSchema):
    name: str
    description: Optional[str] = None
    yield_quantity: float
    yield_unit: str
    selling_price: float


class RecipeCreate(RecipeBase):
    ingredients: List[RecipeIngredientCreate]
    finished_product_id: int

class RecipeOut(RecipeBase):
    id: int
    organization_id: int
    cost_price: float = 0.0
    ingredients: List[RecipeIngredientOut] = []
    finished_product_id: int

# --- Sales ---
class SaleItemBase(BaseSchema):
    recipe_id: int
    quantity: int

class SaleItemCreate(SaleItemBase):
    pass

class SaleItemOut(SaleItemBase):
    id: int
    sale_id: int
    recipe: Optional[RecipeOut] = None

class SaleBase(BaseSchema):
    sale_date: datetime = Field(default_factory=datetime.utcnow)

class SaleCreate(BaseSchema):
    items: List[SaleItemCreate]

class SaleOut(SaleBase):
    id: int
    organization_id: int
    total_amount: float
    items: List[SaleItemOut] = []


# --- AI Predictions & Copilot ---

class AICopilotRequest(BaseSchema):
    question: str

class AICopilotResponse(BaseSchema):
    answer: str

class AIInsightsResponse(BaseSchema):
    health_summary: dict
    reorder_suggestions: List[dict]
    waste_analysis: dict
    timestamp: datetime


# --- Wastage ---

class WastageLogBase(BaseSchema):
    product_id: int
    quantity: float
    reason: str

class WastageCreate(BaseSchema):
    product_id: int
    quantity: float
    reason: str
    notes: Optional[str] = None


class WastageOut(BaseSchema):
    id: int
    organization_id: int
    product_id: int
    quantity: float
    cost_loss: float
    reason: str
    notes: Optional[str] = None
    created_at: datetime

    product: Optional[ProductOut] = None
    
class ProductionCreate(BaseModel):
    recipe_id: int
    quantity_produced: float
    batch_number: str
    expiry_date: Optional[date] = None


class ProductionOut(BaseModel):
    id: int
    organization_id: int
    recipe_id: int
    quantity_produced: float
    batch_number: str
    expiry_date: Optional[date] = None

    model_config = ConfigDict(from_attributes=True)

class ScheduledReportCreate(BaseModel):
    report_type: str
    frequency: str
    email: EmailStr
    export_format: str = "pdf"


class ScheduledReportUpdate(BaseModel):
    report_type: str
    frequency: str
    email: EmailStr
    export_format: str
    enabled: bool


class ScheduledReportResponse(BaseModel):
    id: int
    report_type: str
    frequency: str
    email: EmailStr
    export_format: str
    enabled: bool

    model_config = ConfigDict(from_attributes=True)