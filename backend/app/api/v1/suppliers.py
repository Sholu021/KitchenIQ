from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.deps import get_db, get_current_user, require_manager, require_staff
from app.models.models import Supplier, User, AuditLog
from app.schemas.schemas import SupplierCreate, SupplierOut

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])

@router.post("", response_model=SupplierOut, status_code=status.HTTP_201_CREATED)
def create_supplier(
    req: SupplierCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    # Check duplicate name in organization
    existing = db.query(Supplier).filter(
        Supplier.name.ilike(req.name),
        Supplier.organization_id == current_user.organization_id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A supplier with this name already exists."
        )

    supplier = Supplier(
        organization_id=current_user.organization_id,
        name=req.name,
        phone=req.phone,
        email=req.email,
        address=req.address
    )
    
    db.add(supplier)
    db.flush()

    audit = AuditLog(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="CREATE_SUPPLIER",
        entity_type="supplier",
        entity_id=supplier.id
    )
    db.add(audit)
    db.commit()
    db.refresh(supplier)
    
    return supplier


@router.get("", response_model=List[SupplierOut])
def list_suppliers(
    search: Optional[str] = Query(None, description="Search suppliers by name or email"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff)
):
    query = db.query(Supplier).filter(
        Supplier.organization_id == current_user.organization_id
    )

    if search:
        query = query.filter(
            or_(
                Supplier.name.ilike(f"%{search}%"),
                Supplier.email.ilike(f"%{search}%")
            )
        )

    suppliers = query.order_by(Supplier.name.asc()).all()
    return suppliers


@router.patch("/{supplier_id}", response_model=SupplierOut)
def update_supplier(
    supplier_id: int,
    req: SupplierCreate,  # Reuse SupplierCreate schema for patch
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    supplier = db.query(Supplier).filter(
        Supplier.id == supplier_id,
        Supplier.organization_id == current_user.organization_id
    ).first()

    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found"
        )

    # If name changed, check uniqueness
    if req.name and req.name.lower() != supplier.name.lower():
        existing = db.query(Supplier).filter(
            Supplier.name.ilike(req.name),
            Supplier.organization_id == current_user.organization_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A supplier with this name already exists."
            )

    for field, value in req.model_dump(exclude_unset=True).items():
        setattr(supplier, field, value)

    audit = AuditLog(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="UPDATE_SUPPLIER",
        entity_type="supplier",
        entity_id=supplier.id
    )
    db.add(audit)
    db.commit()
    db.refresh(supplier)
    
    return supplier


@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    supplier = db.query(Supplier).filter(
        Supplier.id == supplier_id,
        Supplier.organization_id == current_user.organization_id
    ).first()

    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found"
        )

    db.delete(supplier)
    
    audit = AuditLog(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="DELETE_SUPPLIER",
        entity_type="supplier",
        entity_id=supplier_id
    )
    db.add(audit)
    db.commit()
    
    return
