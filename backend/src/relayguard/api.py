from __future__ import annotations

import logging
import secrets
from datetime import timedelta
from typing import Any

from relayguard.aws import JobStore, SecretReader, client
from relayguard.config import Settings
from relayguard.domain import (
    AuthenticationError,
    ConflictError,
    deterministic_job_id,
    parse_webhook,
    payload_hash,
    utc_now,
    verify_signature,
)
from relayguard.http import header, request_body, response

LOGGER = logging.getLogger(__name__)


def _dependencies(settings: Settings) -> tuple[JobStore, SecretReader]:
    return (
        JobStore(client("dynamodb"), settings.table_name),
        SecretReader(client("secretsmanager")),
    )


def _authorized(event: dict[str, Any], expected_token: str) -> bool:
    supplied = header(event, "authorization").removeprefix("Bearer ")
    return bool(supplied) and secrets.compare_digest(supplied, expected_token)


def handler(event: dict[str, Any], _context: Any) -> dict[str, Any]:
    route = event.get("routeKey") or f"{event.get('httpMethod', '')} {event.get('resource', '')}"
    if route == "GET /health":
        return response(200, {"status": "ok"})

    settings = Settings.from_env()
    store, secret_reader = _dependencies(settings)
    path = event.get("pathParameters") or {}

    if route == "POST /v1/webhooks/{source}":
        source = str(path.get("source", "")).strip()
        if not source or len(source) > 100:
            return response(400, {"error": "invalid_source"})
        try:
            body = request_body(event, settings.max_body_bytes)
            verify_signature(
                body=body,
                timestamp=header(event, "x-relayguard-timestamp"),
                signature=header(event, "x-relayguard-signature"),
                secret=secret_reader.get(settings.signing_secret_arn),
                now=utc_now(),
                tolerance_seconds=settings.signature_tolerance_seconds,
            )
            webhook = parse_webhook(body, settings.allowed_event_types)
            now = utc_now()
            expires_at = int((now + timedelta(days=settings.job_retention_days)).timestamp())
            job_id, duplicate = store.accept(
                source=source,
                event=webhook,
                body=body,
                job_id=deterministic_job_id(source, webhook.event_id),
                body_hash=payload_hash(body),
                now=now,
                expires_at=expires_at,
            )
        except AuthenticationError:
            LOGGER.info("webhook_rejected", extra={"source": source, "reason": "authentication"})
            return response(401, {"error": "unauthorized"})
        except ConflictError:
            return response(409, {"error": "idempotency_conflict"})
        except ValueError as exc:
            return response(400, {"error": "invalid_request", "message": str(exc)})
        LOGGER.info(
            "webhook_accepted",
            extra={"source": source, "job_id": job_id, "duplicate": duplicate},
        )
        return response(202, {"job_id": job_id, "duplicate": duplicate})

    token = secret_reader.get(settings.operator_token_arn)
    if not _authorized(event, token):
        return response(403, {"error": "forbidden"})
    job_id = str(path.get("job_id", ""))

    if route == "GET /v1/jobs/{job_id}":
        job = store.get(job_id)
        return response(200, job) if job else response(404, {"error": "job_not_found"})

    if route == "POST /v1/jobs/{job_id}/replay":
        now = utc_now()
        try:
            attempt = store.replay(
                job_id=job_id,
                now=now,
                expires_at=int((now + timedelta(days=settings.job_retention_days)).timestamp()),
            )
        except KeyError:
            return response(404, {"error": "job_not_found"})
        except Exception as exc:
            error_code = getattr(exc, "response", {}).get("Error", {}).get("Code")
            if error_code == "TransactionCanceledException":
                return response(409, {"error": "job_not_replayable"})
            raise
        return response(202, {"job_id": job_id, "attempt": attempt})

    return response(404, {"error": "route_not_found"})
