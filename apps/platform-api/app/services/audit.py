from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.audit_event import AuditEvent
from app.models.user import User


def resolve_actor_organization_id(db: Session, user: User | None) -> str | None:
    if user is None:
        return None

    from app.repositories import MembershipRepository
    return MembershipRepository(db).get_organization_id_for_user(user.id)


def _sanitize_payload(value: Any) -> Any:
    if isinstance(value, dict):
        return {k: str(v) if isinstance(v, UUID) else _sanitize_payload(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_sanitize_payload(item) for item in value]
    if isinstance(value, UUID):
        return str(value)
    return value


def record_audit_event(
    db: Session,
    *,
    event_type: str,
    entity_type: str,
    description: str,
    actor: User | None = None,
    entity_id: str | None = None,
    organization_id: str | None = None,
    payload: dict[str, Any] | list[Any] | None = None,
) -> AuditEvent:
    event = AuditEvent(
        event_type=event_type,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        actor_user_id=actor.id if actor else None,
        organization_id=organization_id or resolve_actor_organization_id(db, actor),
        description=description,
        payload=_sanitize_payload(payload),
    )
    db.add(event)
    return event
