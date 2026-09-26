import os
import secrets
from typing import List, Optional
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_token
from app.models.models import User

reusable_oauth2 = HTTPBearer(auto_error=False)

CSRF_COOKIE_NAME = "kitcheniq_csrf"
ACCESS_COOKIE_NAME = "kitcheniq_access"
REFRESH_COOKIE_NAME = "kitcheniq_refresh"
SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}

def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
    token: Optional[HTTPAuthorizationCredentials] = Depends(reusable_oauth2),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    cookie_token = request.cookies.get(ACCESS_COOKIE_NAME)
    bearer_token = token.credentials if token else None
    raw_token = bearer_token or cookie_token
    using_cookie = bool(cookie_token) and not bearer_token

    if not raw_token:
        raise credentials_exception

    if using_cookie and request.method not in SAFE_METHODS:
        csrf_cookie = request.cookies.get(CSRF_COOKIE_NAME)
        csrf_header = request.headers.get("X-CSRF-Token")
        if not csrf_cookie or not csrf_header or not secrets.compare_digest(csrf_cookie, csrf_header):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF validation failed",
            )

    payload = decode_token(raw_token)

    if not payload or payload.get("type") != "access":
        raise credentials_exception

    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    try:
        user_id_int = int(user_id)
    except (TypeError, ValueError):
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id_int).first()
    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )

    return user

class RoleChecker:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = [r.lower() for r in allowed_roles]

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        if current_user.role.lower() not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"User role '{current_user.role}' is not authorized to perform this action. Required role(s): {self.allowed_roles}"
            )
        return current_user

require_owner = RoleChecker(["owner"])
require_manager = RoleChecker(["owner", "manager"])
require_staff = RoleChecker(["owner", "manager", "staff"])

def require_roles(*roles: str):
    return RoleChecker(list(roles))
