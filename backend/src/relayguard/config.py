from __future__ import annotations

import os
from dataclasses import dataclass


def _required(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"missing required environment variable: {name}")
    return value


def _positive_int(name: str, default: int | None = None) -> int:
    raw = os.getenv(name)
    if raw is None and default is not None:
        return default
    try:
        value = int(raw or "")
    except ValueError as exc:
        raise RuntimeError(f"{name} must be an integer") from exc
    if value <= 0:
        raise RuntimeError(f"{name} must be positive")
    return value


@dataclass(frozen=True, slots=True)
class Settings:
    table_name: str
    signing_secret_arn: str
    operator_token_arn: str
    allowed_event_types: frozenset[str]
    job_retention_days: int
    signature_tolerance_seconds: int
    max_body_bytes: int

    @classmethod
    def from_env(cls) -> Settings:
        allowed = frozenset(
            item.strip() for item in _required("ALLOWED_EVENT_TYPES").split(",") if item.strip()
        )
        if not allowed:
            raise RuntimeError("ALLOWED_EVENT_TYPES must contain at least one event type")
        return cls(
            table_name=_required("JOBS_TABLE_NAME"),
            signing_secret_arn=_required("SIGNING_SECRET_ARN"),
            operator_token_arn=_required("OPERATOR_TOKEN_ARN"),
            allowed_event_types=allowed,
            job_retention_days=_positive_int("JOB_RETENTION_DAYS", 7),
            signature_tolerance_seconds=_positive_int("SIGNATURE_TOLERANCE_SECONDS", 300),
            max_body_bytes=_positive_int("MAX_BODY_BYTES", 262_144),
        )
