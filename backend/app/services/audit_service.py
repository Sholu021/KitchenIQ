from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload
from app.models.models import AuditLog


class AuditService:

    @staticmethod
    def log(
        db: Session,
        organization_id: int,
        user_id: int | None,
        action: str,
        entity_type: str,
        entity_id: int | None,
    ):
        audit = AuditLog(
            organization_id=organization_id,
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
        )

        db.add(audit)

    @staticmethod
    def get_logs(
        db: Session,
        organization_id: int,
    ):
        logs = (
            db.query(AuditLog)
            .options(joinedload(AuditLog.user))
            .filter(
                AuditLog.organization_id == organization_id,
            )
            .order_by(
                AuditLog.created_at.desc(),
            )
            .all()
        )
 
        return [
            {
                "id": log.id,
                "action": log.action,
                "entity_type": log.entity_type,
                "entity_id": log.entity_id,
                "user_id": log.user_id,
                "user_name": (
                    log.user.full_name
                    if log.user
                    else None
                ),
                "created_at": log.created_at,
            }
            for log in logs
        ]

    @staticmethod
    def get_entity_logs(
        db: Session,
        organization_id: int,
        entity_type: str,
        entity_id: int,
    ):
        logs = (
            db.query(AuditLog)
            .options(joinedload(AuditLog.user))
            .filter(
                AuditLog.organization_id == organization_id,
                AuditLog.entity_type == entity_type,
                AuditLog.entity_id == entity_id,
            )
            .order_by(
                AuditLog.created_at.desc(),
            )
            .all()
        )

        return [
            {
                "id": log.id,
                "action": log.action,
                "user_name": (
                    log.user.full_name
                    if log.user
                    else None
                ),
                "created_at": log.created_at,
            }
            for log in logs
        ]
        
    @staticmethod
    def get_user_logs(
        db: Session,
        organization_id: int,
        user_id: int,
    ):
        logs = (
            db.query(AuditLog)
            .options(joinedload(AuditLog.user))
            .filter(
                AuditLog.organization_id == organization_id,
                AuditLog.user_id == user_id,
            )
            .order_by(
                AuditLog.created_at.desc(),
            )
            .all()
        )

        return [
            {
                "id": log.id,
                "action": log.action,
                "entity_type": log.entity_type,
                "entity_id": log.entity_id,
                "user_name": (
                    log.user.full_name
                    if log.user
                    else None
                ),
                "created_at": log.created_at,
            }
            for log in logs
        ]

    @staticmethod
    def history(
        db: Session,
        organization_id: int,
        limit: int = 100,
    ):
        return (
            db.query(AuditLog)
            .filter(
                AuditLog.organization_id == organization_id,
            )
            .order_by(
                AuditLog.created_at.desc(),
            )
            .limit(limit)
            .all()
        )