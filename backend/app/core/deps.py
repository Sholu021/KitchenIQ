from typing import List, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_token
from app.models.models import User

reusable_oauth2 = HTTPBearer(auto_error=False)

def get_current_user(
    db: Session = Depends(get_db),
    token: Optional[HTTPAuthorizationCredentials] = Depends(reusable_oauth2),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if token is None:
        raise credentials_exception

    payload = decode_token(token.credentials)

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

# Role dependency shortcuts
require_owner = RoleChecker(["owner"])
require_manager = RoleChecker(["owner", "manager"])
require_staff = RoleChecker(["owner", "manager", "staff"])

def require_roles(*roles: str):
    """
    Example:
        Depends(require_roles("owner"))
        Depends(require_roles("owner", "manager"))
        Depends(require_roles("manager", "staff"))
    """
    return RoleChecker(list(roles))