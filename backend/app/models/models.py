from datetime import datetime, date
from typing import List, Optional
from sqlalchemy import String, Integer, Float, ForeignKey, DateTime, Boolean, Date, JSON, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import text
import sqlalchemy as sa
from app.core.database import Base

class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    subscription_tier: Mapped[str] = mapped_column(String(20), default="Free")
    subscription_status: Mapped[str] = mapped_column(String(20), default="active")
    subscription_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    users: Mapped[List["User"]] = relationship("User", back_populates="organization", cascade="all, delete-orphan")
    categories: Mapped[List["Category"]] = relationship("Category", back_populates="organization", cascade="all, delete-orphan")
    products: Mapped[List["Product"]] = relationship("Product", back_populates="organization", cascade="all, delete-orphan")
    suppliers: Mapped[List["Supplier"]] = relationship("Supplier", back_populates="organization", cascade="all, delete-orphan")
    purchase_orders: Mapped[List["PurchaseOrder"]] = relationship("PurchaseOrder", back_populates="organization", cascade="all, delete-orphan")
    batches: Mapped[List["Batch"]] = relationship("Batch", back_populates="organization", cascade="all, delete-orphan")
    recipes: Mapped[List["Recipe"]] = relationship("Recipe", back_populates="organization", cascade="all, delete-orphan")
    sales: Mapped[List["Sale"]] = relationship("Sale", back_populates="organization", cascade="all, delete-orphan")
    predictions: Mapped[List["AIPrediction"]] = relationship("AIPrediction", back_populates="organization", cascade="all, delete-orphan")
    audit_logs: Mapped[List["AuditLog"]] = relationship("AuditLog", back_populates="organization", cascade="all, delete-orphan")
    wastage_logs: Mapped[List["WastageLog"]] = relationship("WastageLog", back_populates="organization", cascade="all, delete-orphan")
    
    notifications: Mapped[list["Notification"]] = relationship(
        "Notification",
        back_populates="organization",
        cascade="all, delete-orphan",
    )

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    organization_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    full_name: Mapped[str] = mapped_column(String(100), nullable=False)

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )

    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)

    role: Mapped[str] = mapped_column(String(20), nullable=False)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    # Relationships
    organization: Mapped["Organization"] = relationship(
        "Organization",
        back_populates="users",
    )

    audit_logs: Mapped[List["AuditLog"]] = relationship(
        "AuditLog",
        back_populates="user",
    )
    notifications: Mapped[list["Notification"]] = relationship(
        "Notification",
        back_populates="user",
        cascade="all, delete-orphan",
    )

class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    organization_id = mapped_column(
        Integer,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(String(50), nullable=False)

    # Relationships
    organization: Mapped["Organization"] = relationship("Organization", back_populates="categories")
    products: Mapped[List["Product"]] = relationship("Product", back_populates="category")


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    organization_id = mapped_column(
        Integer,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    category_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("categories.id", ondelete="SET NULL"),
        nullable=True,
    )

    supplier_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("suppliers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    sku: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    unit: Mapped[str] = mapped_column(String(20), nullable=False)  # e.g., g, ml, pcs, kg
    current_stock: Mapped[float] = mapped_column(Float, default=0.0)
    reorder_level: Mapped[float] = mapped_column(Float, default=0.0)
    lead_time_days: Mapped[int] = mapped_column(Integer, default=3)

    preferred_order_quantity: Mapped[float] = mapped_column(Float, default=0)

    minimum_order_quantity: Mapped[float] = mapped_column(Float, default=0)
    cost_price: Mapped[float] = mapped_column(Float, default=0.0)
    selling_price: Mapped[float] = mapped_column(Float, default=0.0)
    is_finished_product: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    organization: Mapped["Organization"] = relationship("Organization", back_populates="products")
    category: Mapped[Optional["Category"]] = relationship("Category", back_populates="products")
    supplier: Mapped[Optional["Supplier"]] = relationship(
        "Supplier",
        back_populates="products",
    )
    transactions: Mapped[List["InventoryTransaction"]] = relationship("InventoryTransaction", back_populates="product", cascade="all, delete-orphan")
    purchase_order_items: Mapped[List["PurchaseOrderItem"]] = relationship("PurchaseOrderItem", back_populates="product", cascade="all, delete-orphan")
    batches: Mapped[List["Batch"]] = relationship("Batch", back_populates="product", cascade="all, delete-orphan")
    recipe_ingredients: Mapped[List["RecipeIngredient"]] = relationship("RecipeIngredient", back_populates="product", cascade="all, delete-orphan")
    wastage_logs: Mapped[List["WastageLog"]] = relationship("WastageLog", back_populates="product", cascade="all, delete-orphan")
    recipes = relationship(
        "Recipe",
        foreign_keys="Recipe.finished_product_id",
        back_populates="finished_product",
    )

class InventoryTransaction(Base):
    __tablename__ = "inventory_transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    organization_id = mapped_column(
        Integer,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    purchase_order_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("purchase_orders.id", ondelete="SET NULL"),
        nullable=True,
    ) 
    
    batch_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("batches.id", ondelete="SET NULL"),
        nullable=True,
    )

    created_by: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    product_id: Mapped[int] = mapped_column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    transaction_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        index=True,
    )  # STOCK_IN, STOCK_OUT, ADJUSTMENT
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    reference: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    # Relationships
    organization: Mapped["Organization"] = relationship("Organization")
    product: Mapped["Product"] = relationship("Product", back_populates="transactions")


class Supplier(Base):
    __tablename__ = "suppliers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    organization_id = mapped_column(
        Integer,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
    )
    
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    lead_time_days = mapped_column(
        Integer,
        default=3,
        nullable=False,
    )

    minimum_order_quantity = mapped_column(
        Float,
        default=0,
        nullable=False,
    )

    order_multiple = mapped_column(
        Float,
        default=1,
        nullable=False,
    )

    preferred_supplier: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default=sa.text("false"),
    )
    # Relationships
    organization: Mapped["Organization"] = relationship("Organization", back_populates="suppliers")
    purchase_orders: Mapped[List["PurchaseOrder"]] = relationship("PurchaseOrder", back_populates="supplier")
    products: Mapped[List["Product"]] = relationship(
        "Product",
        back_populates="supplier",
    )

class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    organization_id = mapped_column(
        Integer,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    supplier_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("suppliers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        default="DRAFT",
        nullable=False,
        index=True,
    )

    total_amount: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
    )
    po_number: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )

    order_date: Mapped[date] = mapped_column(
        Date,
        default=date.today,
    )

    expected_delivery_date: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True,
    )

    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    created_by: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )
    received_date = mapped_column(
        DateTime,
        nullable=True,
    )

    sent_date = mapped_column(
        DateTime,
        nullable=True,
    )
    approved_by = mapped_column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
    )

    approved_at = mapped_column(
        DateTime,
        nullable=True,
    )

    approval_notes = mapped_column(
        Text,
        nullable=True,
    )
    rejected_by = mapped_column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
    )

    rejected_at = mapped_column(
        DateTime,
        nullable=True,
    )

    rejection_reason = mapped_column(
        Text,
        nullable=True,
    )
    supplier_invoices = relationship(
        "SupplierInvoice",
        back_populates="purchase_order",
    )
    # Relationships
    organization: Mapped["Organization"] = relationship(
        "Organization",
        back_populates="purchase_orders"
    )

    supplier: Mapped["Supplier"] = relationship(
        "Supplier",
        back_populates="purchase_orders"
    )

    items: Mapped[List["PurchaseOrderItem"]] = relationship(
        "PurchaseOrderItem",
        back_populates="purchase_order",
        cascade="all, delete-orphan"
    )

class SupplierInvoice(Base):
    __tablename__ = "supplier_invoices"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    organization_id = mapped_column(
        Integer,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    purchase_order_id = mapped_column(
        Integer,
        ForeignKey("purchase_orders.id", ondelete="CASCADE"),
        nullable=False,
    )

    supplier_id = mapped_column(
        Integer,
        ForeignKey("suppliers.id", ondelete="CASCADE"),
        nullable=False,
    )

    invoice_number: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    invoice_date = mapped_column(
        Date,
        nullable=False,
    )

    invoice_amount = mapped_column(
        Float,
        nullable=False,
    )

    status = mapped_column(
        String(30),
        default="PENDING_MATCH",
    )

    created_at = mapped_column(
        DateTime,
        default=datetime.utcnow,
    )

    purchase_order = relationship(
        "PurchaseOrder",
        back_populates="supplier_invoices",
    )
    supplier = relationship("Supplier")

class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    purchase_order_id: Mapped[int] = mapped_column(Integer, ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=False)
    product_id: Mapped[int] = mapped_column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    received_quantity: Mapped[float] = mapped_column(
        Float,
        default=0,
        nullable=False,
        server_default="0"
    )
    unit_price: Mapped[float] = mapped_column(Float, nullable=False)
    batch_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    expiry_date: Mapped[Optional[Date]] = mapped_column(Date, nullable=True)
    ai_score: Mapped[int] = mapped_column(
        Integer,
        default=0,
        comment="AI Reorder Priority Score (0-100)"
    )
    # Relationships
    purchase_order: Mapped["PurchaseOrder"] = relationship("PurchaseOrder", back_populates="items")
    product: Mapped["Product"] = relationship("Product", back_populates="purchase_order_items")


class Batch(Base):
    __tablename__ = "batches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    organization_id = mapped_column(
        Integer,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    product_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
    )

    batch_number = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )

    expiry_date = mapped_column(
        Date,
        index=True,
    )

    quantity: Mapped[float] = mapped_column(Float, default=0.0)

    # NEW
    remaining_quantity: Mapped[float] = mapped_column(
        Float,
       default=0.0,
    )

    purchase_price: Mapped[float] = mapped_column(
        Float,
        default=0.0,
    )

    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    organization: Mapped["Organization"] = relationship(
        "Organization",
        back_populates="batches",
    )

    product: Mapped["Product"] = relationship(
        "Product",
        back_populates="batches",
    )
    
class Recipe(Base):
    __tablename__ = "recipes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id = mapped_column(
        Integer,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    yield_quantity = mapped_column(
        Float,
        nullable=False,
        default=1,
    )

    yield_unit = mapped_column(
        String(50),
        nullable=False,
        default="serving",
    )

    selling_price: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0,
    )

    productions = relationship(
        "Production",
        back_populates="recipe",
    )

    finished_product_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("products.id"),
        nullable=False,
    )

    finished_product = relationship(
        "Product",
        foreign_keys=[finished_product_id],
        back_populates="recipes",
    )
    # Relationships
    organization: Mapped["Organization"] = relationship("Organization", back_populates="recipes")
    ingredients: Mapped[List["RecipeIngredient"]] = relationship("RecipeIngredient", back_populates="recipe", cascade="all, delete-orphan")
    sale_items: Mapped[List["SaleItem"]] = relationship("SaleItem", back_populates="recipe")


class RecipeIngredient(Base):
    __tablename__ = "recipe_ingredients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    recipe_id: Mapped[int] = mapped_column(Integer, ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False)
    product_id: Mapped[int] = mapped_column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    quantity_required: Mapped[float] = mapped_column(Float, nullable=False)

    # Relationships
    recipe: Mapped["Recipe"] = relationship("Recipe", back_populates="ingredients")
    product: Mapped["Product"] = relationship("Product", back_populates="recipe_ingredients")


class Sale(Base):
    __tablename__ = "sales"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id = mapped_column(
        Integer,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sale_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    total_amount: Mapped[float] = mapped_column(Float, default=0.0)
    cost_of_goods_sold: Mapped[float] = mapped_column(
        Float,
        default=0.0,
    )

    gross_profit: Mapped[float] = mapped_column(
        Float,
        default=0.0,
    )
    # Relationships
    organization: Mapped["Organization"] = relationship("Organization", back_populates="sales")
    items: Mapped[List["SaleItem"]] = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")


class SaleItem(Base):
    __tablename__ = "sale_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sale_id: Mapped[int] = mapped_column(Integer, ForeignKey("sales.id", ondelete="CASCADE"), nullable=False)
    recipe_id: Mapped[int] = mapped_column(Integer, ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price = mapped_column(
        Float,
        default=0,
        nullable=False,
        server_default=text("0"),
    )

    revenue = mapped_column(
        Float,
        default=0,
        nullable=False,
        server_default=text("0"),
    )

    cost_of_goods_sold = mapped_column(
        Float,
        default=0,
        nullable=False,
        server_default=text("0"),
    )

    gross_profit = mapped_column(
        Float,
        default=0,
        nullable=False,
        server_default=text("0"),
    )
    # Relationships
    sale: Mapped["Sale"] = relationship("Sale", back_populates="items")
    recipe: Mapped["Recipe"] = relationship("Recipe", back_populates="sale_items")


class AIPrediction(Base):
    __tablename__ = "ai_predictions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id = mapped_column(
        Integer,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    prediction_type: Mapped[str] = mapped_column(String(50), nullable=False)  # HEALTH_SUMMARY, REORDER_SUGGESTION, WASTE_ANALYSIS
    prediction_data: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    organization: Mapped["Organization"] = relationship("Organization", back_populates="predictions")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    organization_id = mapped_column(
        Integer,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    user_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    action: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    entity_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    entity_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )

    details: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    organization: Mapped["Organization"] = relationship(
        "Organization",
        back_populates="audit_logs",
    )

    user: Mapped[Optional["User"]] = relationship(
        "User",
        back_populates="audit_logs",
    )

    # Relationships
    organization: Mapped["Organization"] = relationship("Organization", back_populates="audit_logs")
    user: Mapped[Optional["User"]] = relationship("User", back_populates="audit_logs")

class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    organization_id = mapped_column(
        Integer,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    user_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
    )

    title: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    message: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    notification_type: Mapped[str] = mapped_column(
        String(50),
        default="INFO",
    )

    is_read: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    organization: Mapped["Organization"] = relationship(
        "Organization",
        back_populates="notifications",
    )

    user: Mapped["User"] = relationship(
        "User",
        back_populates="notifications",
    )

class WastageLog(Base):
    __tablename__ = "wastage_logs"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    organization_id = mapped_column(
        Integer,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    product_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
    )

    quantity: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    cost_loss: Mapped[float] = mapped_column(
        Float,
        default=0.0,
    )

    reason: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    organization: Mapped["Organization"] = relationship(
        "Organization",
        back_populates="wastage_logs",
    )

    product: Mapped["Product"] = relationship(
        "Product",
        back_populates="wastage_logs",
    )
    
class Production(Base):
    __tablename__ = "productions"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    organization_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )

    recipe_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("recipes.id", ondelete="CASCADE"),
        nullable=False,
    )

    quantity_produced: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    batch_number: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    expiry_date: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True,
    )

    produced_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
    )

    produced_by: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
    )

    recipe = relationship("Recipe")

class ScheduledReport(Base):
    __tablename__ = "scheduled_reports"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    organization_id = mapped_column(
        Integer,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    report_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    # financial
    # inventory
    # suppliers
    # executive

    frequency: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )
    # daily
    # weekly
    # monthly

    email: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    export_format: Mapped[str] = mapped_column(
        String(20),
        default="pdf",
    )
    # pdf
    # excel

    enabled: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
    )

    last_sent = mapped_column(
        DateTime,
        nullable=True,
    )

    created_at = mapped_column(
        DateTime,
        server_default=func.now(),
    )