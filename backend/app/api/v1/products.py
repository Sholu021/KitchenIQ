from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.services.audit_service import AuditService
from app.core.deps import get_db, get_current_user, require_manager, require_staff
from app.models.models import Product, Category, User, AuditLog, Organization
from app.schemas.schemas import (
    ProductCreate,
    ProductUpdate,
    ProductOut,
    ProductListResponse,
    CategoryCreate,
    CategoryOut
)

router = APIRouter(prefix="/products", tags=["Products & Categories"])


# --- Categories API ---

@router.post("/categories", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(
    req: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    # Check if category name exists in organization
    existing = db.query(Category).filter(
        Category.name.ilike(req.name),
        Category.organization_id == current_user.organization_id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category already exists"
        )
    
    category = Category(
        organization_id=current_user.organization_id,
        name=req.name
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.get("/categories", response_model=List[CategoryOut])
def list_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff)
):
    categories = db.query(Category).filter(
        Category.organization_id == current_user.organization_id
    ).order_by(Category.name.asc()).all()
    return categories


# --- Products API ---

@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(
    req: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    # Check subscription limits
    org = db.query(Organization).filter(Organization.id == current_user.organization_id).first()
    if org and org.subscription_tier == "Free":
        products_count = db.query(Product).filter(Product.organization_id == current_user.organization_id).count()
        if products_count >= 3:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Organization product limit (3) reached on Free tier. Upgrade to Pro."
            )

    # Check SKU uniqueness in organization if SKU is provided
    if req.sku:
        existing = db.query(Product).filter(
            Product.sku == req.sku,
            Product.organization_id == current_user.organization_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"SKU '{req.sku}' is already in use."
            )
            
    # Check if category belongs to this org
    if req.category_id:
        cat = db.query(Category).filter(
            Category.id == req.category_id,
            Category.organization_id == current_user.organization_id
        ).first()
        if not cat:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid category ID"
            )

    product = Product(
        organization_id=current_user.organization_id,
        category_id=req.category_id,
        name=req.name,
        sku=req.sku,
        unit=req.unit,
        current_stock=0.0,  # initial stock must be recorded through stock movement/transactions
        reorder_level=req.reorder_level,
        cost_price=req.cost_price,
        selling_price=req.selling_price
    )
    
    db.add(product)
    db.flush()

    db.commit()
    db.refresh(product)

    AuditService.log(
        db=db,
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="CREATE_PRODUCT",
        entity_type="Product",
        entity_id=product.id,
    )
    
    return product


@router.get("", response_model=ProductListResponse)
def list_products(
    search: Optional[str] = Query(None, description="Search by product name or SKU"),
    category_id: Optional[int] = Query(None, description="Filter by Category ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff)
):
    query = db.query(Product).filter(
        Product.organization_id == current_user.organization_id
    )

    if category_id is not None:
        query = query.filter(Product.category_id == category_id)

    if search:
        query = query.filter(
            or_(
                Product.name.ilike(f"%{search}%"),
                Product.sku.ilike(f"%{search}%")
            )
        )

    total = query.count()
    products = query.order_by(Product.name.asc()).offset(skip).limit(limit).all()

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": products
    }


@router.patch("/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    req: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.organization_id == current_user.organization_id
    ).first()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    # Validate SKU uniqueness
    if req.sku and req.sku != product.sku:
        existing = db.query(Product).filter(
            Product.sku == req.sku,
            Product.organization_id == current_user.organization_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"SKU '{req.sku}' is already in use."
            )

    # Validate category
    if req.category_id is not None:
        cat = db.query(Category).filter(
            Category.id == req.category_id,
            Category.organization_id == current_user.organization_id
        ).first()
        if not cat:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid category ID"
            )

    for field, value in req.model_dump(exclude_unset=True).items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)

    AuditService.log(
        db=db,
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="UPDATE",
        entity_type="Product",
        entity_id=product.id,
    )

    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.organization_id == current_user.organization_id
    ).first()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    db.delete(product)
    
    db.commit()

    AuditService.log(
        db=db,
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="DELETE",
        entity_type="Product",
        entity_id=product_id,
    )
    
    return
