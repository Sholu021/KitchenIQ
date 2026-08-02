from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
from app.core.security import (
    create_access_token,
    create_refresh_token,
    verify_password,
    get_password_hash,
    decode_token
)
from app.models.models import Organization, User, AuditLog, Product, Recipe, Batch
from app.schemas.schemas import (
    RegisterOrgOwnerRequest,
    LoginRequest,
    RefreshTokenRequest,
    Token,
    UserOut,
    SubscriptionUpgradeRequest,
    OrganizationDetailsOut
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register_organization_and_owner(
    req: RegisterOrgOwnerRequest,
    db: Session = Depends(get_db)
):
    try:
        # Check if user email already exists
        existing_user = db.query(User).filter(
            User.email == req.owner_email
        ).first()

        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email already exists."
            )

        # Create Organization
        org = Organization(name=req.organization_name)
        db.add(org)
        db.flush()

        # Create Owner User
        hashed_password = get_password_hash(req.owner_password)

        owner = User(
            organization_id=org.id,
            full_name=req.owner_name,
            email=req.owner_email,
            hashed_password=hashed_password,
            role="Owner",
            is_active=True
        )
        db.add(owner)
        db.flush()

        # Create Audit Log
        audit = AuditLog(
            organization_id=org.id,
            user_id=owner.id,
            action="REGISTER_ORG_AND_OWNER",
            entity_type="organization",
            entity_id=org.id
        )
        db.add(audit)

        db.commit()
        db.refresh(owner)

        # Generate Tokens
        access_token = create_access_token(subject=owner.id)
        refresh_token = create_refresh_token(subject=owner.id)

        return Token(
            access_token=access_token,
            refresh_token=refresh_token,
            role=owner.role,
            organization_id=owner.organization_id,
            user_name=owner.full_name
        )

    except HTTPException:
        db.rollback()
        raise

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )

@router.post("/login", response_model=Token)
def login(
    req: LoginRequest,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account"
        )

    # Audit Log
    audit = AuditLog(
        organization_id=user.organization_id,
        user_id=user.id,
        action="LOGIN",
        entity_type="user",
        entity_id=user.id
    )
    db.add(audit)
    db.commit()

    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        role=user.role,
        organization_id=user.organization_id,
        user_name=user.full_name
    )


@router.post("/refresh", response_model=Token)
def refresh_token(
    req: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    payload = decode_token(req.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token subject"
        )

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )

    access_token = create_access_token(subject=user.id)
    new_refresh_token = create_refresh_token(subject=user.id)

    return Token(
        access_token=access_token,
        refresh_token=new_refresh_token,
        role=user.role,
        organization_id=user.organization_id,
        user_name=user.full_name
    )


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/organization", response_model=OrganizationDetailsOut)
def get_organization_details(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    org = db.query(Organization).filter(Organization.id == current_user.organization_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    # Compute usage counts
    products_count = db.query(Product).filter(Product.organization_id == org.id).count()
    recipes_count = db.query(Recipe).filter(Recipe.organization_id == org.id).count()
    batches_count = db.query(Batch).filter(
        Batch.organization_id == org.id,
        Batch.quantity > 0
    ).count()

    # Define limits
    products_limit = 3 if org.subscription_tier == "Free" else None
    recipes_limit = 2 if org.subscription_tier == "Free" else None
    batches_limit = 5 if org.subscription_tier == "Free" else None

    return OrganizationDetailsOut(
        id=org.id,
        name=org.name,
        subscription_tier=org.subscription_tier,
        subscription_status=org.subscription_status,
        subscription_expires_at=org.subscription_expires_at,
        created_at=org.created_at,
        products_count=products_count,
        products_limit=products_limit,
        recipes_count=recipes_count,
        recipes_limit=recipes_limit,
        batches_count=batches_count,
        batches_limit=batches_limit
    )


@router.post("/organization/subscription", response_model=OrganizationDetailsOut)
def update_subscription(
    req: SubscriptionUpgradeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Only Owners can manage subscriptions
    if current_user.role != "Owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the Organization Owner can modify billing and subscription tiers."
        )
    
    tier = req.tier
    if tier not in ["Free", "Pro", "Enterprise"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid subscription tier. Choose 'Free', 'Pro', or 'Enterprise'."
        )
    
    org = db.query(Organization).filter(Organization.id == current_user.organization_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    org.subscription_tier = tier
    org.subscription_status = "active"
    db.commit()
    db.refresh(org)

    # Log Audit Log
    audit = AuditLog(
        organization_id=org.id,
        user_id=current_user.id,
        action=f"UPGRADE_SUBSCRIPTION_{tier.upper()}",
        entity_type="organization",
        entity_id=org.id
    )
    db.add(audit)
    db.commit()

    # Compute usage counts
    products_count = db.query(Product).filter(Product.organization_id == org.id).count()
    recipes_count = db.query(Recipe).filter(Recipe.organization_id == org.id).count()
    batches_count = db.query(Batch).filter(
        Batch.organization_id == org.id,
        Batch.quantity > 0
    ).count()

    products_limit = 3 if org.subscription_tier == "Free" else None
    recipes_limit = 2 if org.subscription_tier == "Free" else None
    batches_limit = 5 if org.subscription_tier == "Free" else None

    return OrganizationDetailsOut(
        id=org.id,
        name=org.name,
        subscription_tier=org.subscription_tier,
        subscription_status=org.subscription_status,
        subscription_expires_at=org.subscription_expires_at,
        created_at=org.created_at,
        products_count=products_count,
        products_limit=products_limit,
        recipes_count=recipes_count,
        recipes_limit=recipes_limit,
        batches_count=batches_count,
        batches_limit=batches_limit
    )
