import hashlib
import hmac
import json
from datetime import UTC, datetime, timedelta

import pytest

from relayguard.domain import (
    AuthenticationError,
    InvalidTransitionError,
    JobStatus,
    ValidationError,
    deterministic_job_id,
    parse_webhook,
    payload_hash,
    require_replayable,
    verify_signature,
)


def _body(event_id: str = "evt-1") -> bytes:
    return json.dumps(
        {"version": 1, "event_id": event_id, "event_type": "invoice.paid", "data": {"x": 1}}
    ).encode()


def test_signature_accepts_valid_request() -> None:
    now = datetime(2026, 1, 1, tzinfo=UTC)
    timestamp = str(int(now.timestamp()))
    body = _body()
    digest = hmac.new(b"secret", timestamp.encode() + b"." + body, hashlib.sha256).hexdigest()

    verify_signature(
        body=body,
        timestamp=timestamp,
        signature=f"sha256={digest}",
        secret="secret",
        now=now,
        tolerance_seconds=300,
    )


@pytest.mark.parametrize("signature", ["sha256=wrong", "", "sha256=00"])
def test_signature_rejects_tampering(signature: str) -> None:
    now = datetime(2026, 1, 1, tzinfo=UTC)
    with pytest.raises(AuthenticationError):
        verify_signature(
            body=_body(),
            timestamp=str(int(now.timestamp())),
            signature=signature,
            secret="secret",
            now=now,
            tolerance_seconds=300,
        )


def test_signature_rejects_stale_timestamp() -> None:
    now = datetime(2026, 1, 1, tzinfo=UTC)
    old = now - timedelta(seconds=301)
    with pytest.raises(AuthenticationError):
        verify_signature(
            body=_body(),
            timestamp=str(int(old.timestamp())),
            signature="irrelevant",
            secret="secret",
            now=now,
            tolerance_seconds=300,
        )


@pytest.mark.parametrize("timestamp", ["", "not-a-number", "999999999999999999999"])
def test_signature_rejects_invalid_timestamp(timestamp: str) -> None:
    with pytest.raises(AuthenticationError, match="timestamp"):
        verify_signature(
            body=_body(),
            timestamp=timestamp,
            signature="irrelevant",
            secret="secret",
            now=datetime(2026, 1, 1, tzinfo=UTC),
            tolerance_seconds=300,
        )


def test_signature_rejects_timestamp_too_far_in_future() -> None:
    now = datetime(2026, 1, 1, tzinfo=UTC)
    future = now + timedelta(seconds=301)

    with pytest.raises(AuthenticationError, match="outside"):
        verify_signature(
            body=_body(),
            timestamp=str(int(future.timestamp())),
            signature="irrelevant",
            secret="secret",
            now=now,
            tolerance_seconds=300,
        )


def test_webhook_contract_and_deterministic_id() -> None:
    event = parse_webhook(_body(), frozenset({"invoice.paid"}))
    assert event.event_id == "evt-1"
    assert deterministic_job_id("billing", event.event_id) == deterministic_job_id(
        "billing", event.event_id
    )
    assert deterministic_job_id("crm", event.event_id) != deterministic_job_id(
        "billing", event.event_id
    )
    assert payload_hash(_body()) == hashlib.sha256(_body()).hexdigest()


@pytest.mark.parametrize(
    "payload",
    [
        b"not-json",
        b"[]",
        b'{"version":2,"event_id":"1","event_type":"invoice.paid","data":{}}',
        b'{"version":1,"event_id":"","event_type":"invoice.paid","data":{}}',
        b'{"version":1,"event_id":"1","event_type":"unknown","data":{}}',
        b'{"version":1,"event_id":"1","event_type":"invoice.paid","data":[]}',
    ],
)
def test_webhook_contract_rejects_invalid_payload(payload: bytes) -> None:
    with pytest.raises(ValidationError):
        parse_webhook(payload, frozenset({"invoice.paid"}))


@pytest.mark.parametrize(
    "status", [JobStatus.FAILED, JobStatus.UNSUPPORTED, JobStatus.REVIEW_REQUIRED]
)
def test_replayable_statuses_are_accepted(status: JobStatus) -> None:
    require_replayable(status)


@pytest.mark.parametrize(
    "status", [JobStatus.ACCEPTED, JobStatus.QUEUED, JobStatus.RUNNING, JobStatus.SUCCEEDED]
)
def test_non_replayable_statuses_are_rejected(status: JobStatus) -> None:
    with pytest.raises(InvalidTransitionError, match="cannot be replayed"):
        require_replayable(status)
