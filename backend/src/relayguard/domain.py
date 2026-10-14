from __future__ import annotations

import hashlib
import hmac
import json
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from enum import StrEnum
from typing import Any


class ValidationError(ValueError):
    """The inbound event does not satisfy the public contract."""


class AuthenticationError(ValueError):
    """The request signature or operator credential is invalid."""


class ConflictError(ValueError):
    """An idempotency key was reused for a different payload."""


class InvalidTransitionError(ValueError):
    """A requested job transition is not valid."""


class JobStatus(StrEnum):
    ACCEPTED = "ACCEPTED"
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"
    UNSUPPORTED = "UNSUPPORTED"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"


TERMINAL_STATUSES = frozenset(
    {JobStatus.SUCCEEDED, JobStatus.FAILED, JobStatus.UNSUPPORTED, JobStatus.REVIEW_REQUIRED}
)
REPLAYABLE_STATUSES = frozenset(
    {JobStatus.FAILED, JobStatus.UNSUPPORTED, JobStatus.REVIEW_REQUIRED}
)


@dataclass(frozen=True, slots=True)
class WebhookEvent:
    version: int
    event_id: str
    event_type: str
    data: dict[str, Any]


def utc_now() -> datetime:
    return datetime.now(UTC)


def parse_webhook(body: bytes, allowed_event_types: frozenset[str]) -> WebhookEvent:
    try:
        decoded = json.loads(body)
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValidationError("body must be valid JSON") from exc

    if not isinstance(decoded, dict):
        raise ValidationError("body must be a JSON object")
    if decoded.get("version") != 1:
        raise ValidationError("version must be 1")

    event_id = decoded.get("event_id")
    event_type = decoded.get("event_type")
    data = decoded.get("data")
    if not isinstance(event_id, str) or not event_id.strip() or len(event_id) > 200:
        raise ValidationError("event_id must be a non-empty string of at most 200 characters")
    if not isinstance(event_type, str) or not event_type.strip() or len(event_type) > 200:
        raise ValidationError("event_type must be a non-empty string of at most 200 characters")
    if event_type not in allowed_event_types:
        raise ValidationError("event_type is not allowed")
    if not isinstance(data, dict):
        raise ValidationError("data must be a JSON object")

    return WebhookEvent(version=1, event_id=event_id, event_type=event_type, data=data)


def verify_signature(
    *,
    body: bytes,
    timestamp: str,
    signature: str,
    secret: str,
    now: datetime,
    tolerance_seconds: int,
) -> None:
    try:
        signed_at = datetime.fromtimestamp(int(timestamp), tz=UTC)
    except (ValueError, OverflowError) as exc:
        raise AuthenticationError("invalid signature timestamp") from exc

    if abs((now - signed_at).total_seconds()) > tolerance_seconds:
        raise AuthenticationError("signature timestamp is outside the allowed window")

    digest = hmac.new(secret.encode(), timestamp.encode() + b"." + body, hashlib.sha256).hexdigest()
    supplied = signature.removeprefix("sha256=")
    if len(supplied) != len(digest) or not hmac.compare_digest(supplied, digest):
        raise AuthenticationError("invalid signature")


def payload_hash(body: bytes) -> str:
    return hashlib.sha256(body).hexdigest()


def deterministic_job_id(source: str, event_id: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"relayguard:{source}:{event_id}"))


def require_replayable(status: JobStatus) -> None:
    if status not in REPLAYABLE_STATUSES:
        raise InvalidTransitionError(f"job in {status} cannot be replayed")
