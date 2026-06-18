from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.deps import get_db, require_manager, require_staff
from app.core.security import get_password_hash
from app.models.models import User, AuditLog
from app.schemas.schemas import UserCreate, UserUpdate, UserOut

router = APIRouter(prefix="/users", tags=["Team & User Management"])

@router.get("", response_model=List[UserOut])
def list_team_members(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff)
):
    members = db.query(User).filter(
        User.organization_id == current_user.organization_id
    ).order_by(User.full_name.asc()).all()
    return members


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def add_team_member(
    req: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    org_id = current_user.organization_id

    # Check email uniqueness globally
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )

    # Enforce role logic: Only Owner can create Managers
    if req.role == "Manager" and current_user.role != "Owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Owners can create Manager accounts."
        )
    if req.role == "Owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot create additional Owner accounts."
        )

    hashed_pw = get_password_hash(req.password)
    user = User(
        organization_id=org_id,
        full_name=req.full_name,
        email=req.email,
        hashed_password=hashed_pw,
        role=req.role,
        is_active=req.is_active
    )
    db.add(user)
    db.flush()

    audit = AuditLog(
        organization_id=org_id,
        user_id=current_user.id,
        action=f"CREATE_USER_{req.role.upper()}",
        entity_type="user",
        entity_id=user.id
    )
    db.add(audit)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}", response_model=UserOut)
def update_team_member(
    user_id: int,
    req: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    org_id = current_user.organization_id

    # Fetch user to update
    user = db.query(User).filter(
        User.id == user_id,
        User.organization_id == org_id
    ).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found in your organization"
        )

    # Restrictions
    if user.role == "Owner" and current_user.role != "Owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the Owner can update their own account."
        )

    if req.role and req.role != user.role:
        if current_user.role != "Owner":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Owners can change user roles."
            )
        if user.role == "Owner" and req.role != "Owner":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot demote the primary Owner role."
            )

    # Apply updates
    if req.email and req.email != user.email:
        existing = db.query(User).filter(User.email == req.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is already in use."
            )
        user.email = req.email

    if req.full_name is not None:
        user.full_name = req.full_name
    if req.role is not None:
        user.role = req.role
    if req.is_active is not None:
        if user.id == current_user.id and not req.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot deactivate your own account."
            )
        user.is_active = req.is_active
    if req.password is not None:
        user.hashed_password = get_password_hash(req.password)

    audit = AuditLog(
        organization_id=org_id,
        user_id=current_user.id,
        action="UPDATE_USER",
        entity_type="user",
        entity_id=user.id
    )
    db.add(audit)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_team_member(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    org_id = current_user.organization_id

    # Fetch user
    user = db.query(User).filter(
        User.id == user_id,
        User.organization_id == org_id
    ).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found in your organization"
        )

    # Restrictions
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account."
        )
    if user.role == "Owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete the primary Owner account."
        )
    if user.role == "Manager" and current_user.role != "Owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Owners can delete Manager accounts."
        )

    db.delete(user)

    audit = AuditLog(
        organization_id=org_id,
        user_id=current_user.id,
        action="DELETE_USER",
        entity_type="user",
        entity_id=user_id
    )
    db.add(audit)
    db.commit()
    return


@router.get("/audit-logs", response_model=List[dict])
def get_audit_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff)
):
    logs = db.query(
        AuditLog.id,
        AuditLog.action,
        AuditLog.entity_type,
        AuditLog.entity_id,
        AuditLog.created_at,
        User.full_name.label("user_name")
    ).outerjoin(User, AuditLog.user_id == User.id).filter(
        AuditLog.organization_id == current_user.organization_id
    ).order_by(desc(AuditLog.created_at)).limit(50).all()

    result = []
    for item in logs:
        result.append({
            "id": item[0],
            "action": item[1],
            "entity_type": item[2],
            "entity_id": item[3],
            "created_at": item[4],
            "user_name": item[5] or "System / External"
        })
    return result
