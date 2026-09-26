import logging
import os
import secrets

logger = logging.getLogger(__name__)
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user, require_owner, CSRF_COOKIE_NAME, ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME
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
    AuthSession,
    UserOut,
    SubscriptionUpgradeRequest,
    OrganizationDetailsOut
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax")
COOKIE_DOMAIN = os.getenv("COOKIE_DOMAIN") or None
ACCESS_COOKIE_MAX_AGE = 15 * 60
REFRESH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60

def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    csrf_token = secrets.token_urlsafe(32)
    common = {"secure": COOKIE_SECURE, "httponly": True, "samesite": COOKIE_SAMESITE, "domain": COOKIE_DOMAIN, "path": "/"}
    response.set_cookie(ACCESS_COOKIE_NAME, access_token, max_age=ACCESS_COOKIE_MAX_AGE, **common)
    response.set_cookie(REFRESH_COOKIE_NAME, refresh_token, max_age=REFRESH_COOKIE_MAX_AGE, **common)
    response.set_cookie(CSRF_COOKIE_NAME, csrf_token, max_age=REFRESH_COOKIE_MAX_AGE, secure=COOKIE_SECURE, httponly=False, samesite=COOKIE_SAMESITE, domain=COOKIE_DOMAIN, path="/")

def _clear_auth_cookies(response: Response) -> None:
    for name in (ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME, CSRF_COOKIE_NAME):
        response.delete_cookie(name, domain=COOKIE_DOMAIN, path="/")

@router.post("/register", response_model=AuthSession, status_code=status.HTTP_201_CREATED)
def register_organization_and_owner(
    req: RegisterOrgOwnerRequest,
    response: Response,
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

        _set_auth_cookies(response, access_token, refresh_token)
        return AuthSession(role=owner.role, organization_id=owner.organization_id, user_name=owner.full_name)

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        logger.exception("Organization registration failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed. Please try again.",
        )

@router.post("/login", response_model=Token)
def login(
    req: LoginRequest,
    response: Response,
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

    _set_auth_cookies(response, access_token, refresh_token)
    return AuthSession(role=user.role, organization_id=user.organization_id, user_name=user.full_name)


@router.post("/refresh", response_model=Token)
def refresh_token(
    req: RefreshTokenRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    raw_refresh_token = req.refresh_token or request.cookies.get(REFRESH_COOKIE_NAME)
    if not raw_refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token missing")
    payload = decode_token(raw_refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    user_id = payload.get("sub")

    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token subject",
        )

    try:
        user_id_int = int(user_id)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token subject",
        )

    user = (
        db.query(User)
        .filter(User.id == user_id_int)
        .first()
    )
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )

    access_token = create_access_token(subject=user.id)
    new_refresh_token = create_refresh_token(subject=user.id)

    _set_auth_cookies(response, access_token, new_refresh_token)
    return AuthSession(role=user.role, organization_id=user.organization_id, user_name=user.full_name)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response):
    _clear_auth_cookies(response)
    return None


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
    current_user: User = Depends(require_owner)
):
    # Paid plans must be activated through the verified Razorpay billing flow.
    if req.tier != "Free":
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Paid subscription changes must use the Razorpay billing flow.",
        )

    org = db.query(Organization).filter(Organization.id == current_user.organization_id).first()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    org.subscription_tier = "Free"
    org.subscription_status = "active"
    org.subscription_expires_at = None

    db.add(
        AuditLog(
            organization_id=org.id,
            user_id=current_user.id,
            action="CHANGE_SUBSCRIPTION_FREE",
            entity_type="organization",
            entity_id=org.id,
        )
    )
    db.commit()
    db.refresh(org)

    products_count = db.query(Product).filter(Product.organization_id == org.id).count()
    recipes_count = db.query(Recipe).filter(Recipe.organization_id == org.id).count()
    batches_count = db.query(Batch).filter(
        Batch.organization_id == org.id,
        Batch.quantity > 0
    ).count()

    return OrganizationDetailsOut(
        id=org.id,
        name=org.name,
        subscription_tier=org.subscription_tier,
        subscription_status=org.subscription_status,
        subscription_expires_at=org.subscription_expires_at,
        created_at=org.created_at,
        products_count=products_count,
        products_limit=3,
        recipes_count=recipes_count,
        recipes_limit=2,
        batches_count=batches_count,
        batches_limit=5,
    )
