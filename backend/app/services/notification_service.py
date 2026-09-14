from sqlalchemy.orm import Session
from sqlalchemy import desc
from fastapi import HTTPException, status
from app.models.models import Notification


def create_notification(
    db: Session,
    organization_id: int,
    title: str,
    message: str,
    notification_type: str,
):
    existing = (
        db.query(Notification)
        .filter(
            Notification.organization_id == organization_id,
            Notification.title == title,
            Notification.message == message,
            Notification.is_read == False,
        )
        .first()
    )

    if existing:
        return existing

    notification = Notification(
        organization_id=organization_id,
        title=title,
        message=message,
        notification_type=notification_type,
    )

    db.add(notification)
    db.flush()

    return notification

def list_notifications(
    db: Session,
    organization_id: int,
):
    return (
        db.query(Notification)
        .filter(
            Notification.organization_id == organization_id,
        )
        .order_by(
            desc(Notification.created_at),
        )
        .all()
    )


def unread_notifications(
    db: Session,
    organization_id: int,
):
    return (
        db.query(Notification)
        .filter(
            Notification.organization_id == organization_id,
            Notification.is_read == False,
        )
        .order_by(
            desc(Notification.created_at),
        )
        .all()
    )


def unread_count(
    db: Session,
    organization_id: int,
):
    return (
        db.query(Notification)
        .filter(
            Notification.organization_id == organization_id,
            Notification.is_read == False,
        )
        .count()
    )


def mark_as_read(
    db: Session,
    notification_id: int,
    organization_id: int,
):
    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.organization_id == organization_id,
        )
        .first()
    )

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    notification.is_read = True
    db.flush()

    return notification


def mark_all_as_read(
    db: Session,
    organization_id: int,
):
    (
        db.query(Notification)
        .filter(
            Notification.organization_id == organization_id,
            Notification.is_read == False,
        )
        .update(
            {"is_read": True},
            synchronize_session=False,
        )
    )

    db.flush()


def delete_notification(
    db: Session,
    notification_id: int,
    organization_id: int,
):
    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.organization_id == organization_id,
        )
        .first()
    )

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    db.delete(notification)
    db.flush()

    return notification