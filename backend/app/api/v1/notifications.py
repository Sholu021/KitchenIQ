from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_staff
from app.models.models import User
from app.schemas.notification import NotificationResponse

from app.services.notification_service import (
    list_notifications,
    unread_notifications,
    unread_count,
    mark_as_read,
    mark_all_as_read,
    delete_notification,
)

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
)

@router.get(
    "/",
    response_model=List[NotificationResponse],
)
def get_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    return list_notifications(
        db=db,
        organization_id=current_user.organization_id,
    )

@router.get(
    "/unread",
    response_model=List[NotificationResponse],
)
def get_unread_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    return unread_notifications(
        db=db,
        organization_id=current_user.organization_id,
    )

@router.get("/unread-count")
def get_unread_notification_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    return {
        "count": unread_count(
            db=db,
            organization_id=current_user.organization_id,
        )
    }

@router.patch("/{notification_id}/read")
def read_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    notification = mark_as_read(
        db=db,
        notification_id=notification_id,
        organization_id=current_user.organization_id,
    )

    return {
        "message": "Notification marked as read",
        "notification": notification,
    }

@router.patch("/read-all")
def read_all_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    mark_all_as_read(
        db=db,
        organization_id=current_user.organization_id,
    )

    return {
        "message": "All notifications marked as read"
    }

@router.delete("/{notification_id}")
def remove_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    delete_notification(
        db=db,
        notification_id=notification_id,
        organization_id=current_user.organization_id,
    )

    return {
        "message": "Notification deleted"
    }