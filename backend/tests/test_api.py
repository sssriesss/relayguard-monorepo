import hashlib
import hmac
import json
from datetime import UTC, datetime
from unittest.mock import Mock

import pytest
from botocore.exceptions import ClientError

from relayguard import api
from relayguard.config import Settings
from relayguard.domain import ConflictError

NOW = datetime(2026, 1, 1, tzinfo=UTC)
SETTINGS = Settings(
    table_name="jobs",
    signing_secret_arn="signing-secret",
    operator_token_arn="operator-token",
    allowed_event_types=frozenset({"invoice.paid"}),
    job_retention_days=7,
    signature_tolerance_seconds=300,
    max_body_bytes=1024,
)


class Secrets:
    def get(self, arn: str) -> str:
        return {"signing-secret": "signing-value", "operator-token": "operator-value"}[arn]


def body(event_id: str = "evt-1", data: dict[str, object] | None = None) -> bytes:
    return json.dumps(
        {
            "version": 1,
            "event_id": event_id,
            "event_type": "invoice.paid",
            "data": data or {"invoice_id": "inv-1"},
        },
        separators=(",", ":"),
    ).encode()


def signature_headers(payload: bytes) -> dict[str, str]:
    timestamp = str(int(NOW.timestamp()))
    digest = hmac.new(
        b"signing-value", timestamp.encode() + b"." + payload, hashlib.sha256
    ).hexdigest()
    return {
        "x-relayguard-timestamp": timestamp,
        "x-relayguard-signature": f"sha256={digest}",
    }


def decoded(result: dict[str, object]) -> tuple[int, dict[str, object]]:
    return int(result["statusCode"]), json.loads(str(result["body"]))


@pytest.fixture
def store(monkeypatch: pytest.MonkeyPatch) -> Mock:
    fake = Mock()
    monkeypatch.setattr(api.Settings, "from_env", classmethod(lambda cls: SETTINGS))
    monkeypatch.setattr(api, "_dependencies", lambda settings: (fake, Secrets()))
    monkeypatch.setattr(api, "utc_now", lambda: NOW)
    return fake


def webhook_event(payload: bytes, source: str = "billing") -> dict[str, object]:
    return {
        "routeKey": "POST /v1/webhooks/{source}",
        "pathParameters": {"source": source},
        "headers": signature_headers(payload),
        "body": payload.decode(),
    }


def operator_event(route: str, job_id: str = "job-1", token: str = "operator-value") -> dict:
    return {
        "routeKey": route,
        "pathParameters": {"job_id": job_id},
        "headers": {"authorization": f"Bearer {token}"},
    }


def test_health_does_not_initialize_runtime_dependencies(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        api.Settings,
        "from_env",
        classmethod(lambda cls: (_ for _ in ()).throw(AssertionError("must not load settings"))),
    )

    assert decoded(api.handler({"routeKey": "GET /health"}, None)) == (200, {"status": "ok"})


def test_webhook_accepts_valid_event(store: Mock) -> None:
    store.accept.return_value = ("job-1", False)
    payload = body()

    result = decoded(api.handler(webhook_event(payload), None))

    assert result == (202, {"job_id": "job-1", "duplicate": False})
    accepted = store.accept.call_args.kwargs
    assert accepted["source"] == "billing"
    assert accepted["event"].event_id == "evt-1"
    assert accepted["expires_at"] == int(NOW.timestamp()) + 7 * 24 * 60 * 60


def test_webhook_returns_existing_job_for_duplicate(store: Mock) -> None:
    store.accept.return_value = ("existing-job", True)

    assert decoded(api.handler(webhook_event(body()), None)) == (
        202,
        {"job_id": "existing-job", "duplicate": True},
    )


@pytest.mark.parametrize("source", ["", " ", "x" * 101])
def test_webhook_rejects_invalid_source(store: Mock, source: str) -> None:
    assert decoded(api.handler(webhook_event(body(), source), None)) == (
        400,
        {"error": "invalid_source"},
    )
    store.accept.assert_not_called()


def test_webhook_rejects_invalid_signature(store: Mock) -> None:
    event = webhook_event(body())
    event["headers"] = {
        "x-relayguard-timestamp": str(int(NOW.timestamp())),
        "x-relayguard-signature": "sha256=wrong",
    }

    assert decoded(api.handler(event, None)) == (401, {"error": "unauthorized"})
    store.accept.assert_not_called()


def test_webhook_reports_invalid_contract(store: Mock) -> None:
    payload = b'{"version":1,"event_id":"evt-1","event_type":"unknown","data":{}}'

    status, result = decoded(api.handler(webhook_event(payload), None))

    assert status == 400
    assert result["error"] == "invalid_request"
    assert "not allowed" in str(result["message"])


def test_webhook_reports_idempotency_conflict(store: Mock) -> None:
    store.accept.side_effect = ConflictError("different payload")

    assert decoded(api.handler(webhook_event(body()), None)) == (
        409,
        {"error": "idempotency_conflict"},
    )


def test_operator_routes_require_exact_bearer_token(store: Mock) -> None:
    event = operator_event("GET /v1/jobs/{job_id}", token="wrong")

    assert decoded(api.handler(event, None)) == (403, {"error": "forbidden"})
    store.get.assert_not_called()


def test_get_job_returns_job_or_not_found(store: Mock) -> None:
    store.get.return_value = {"job_id": "job-1", "status": "SUCCEEDED"}

    assert decoded(api.handler(operator_event("GET /v1/jobs/{job_id}"), None)) == (
        200,
        {"job_id": "job-1", "status": "SUCCEEDED"},
    )

    store.get.return_value = None
    assert decoded(api.handler(operator_event("GET /v1/jobs/{job_id}"), None)) == (
        404,
        {"error": "job_not_found"},
    )


def test_replay_returns_new_attempt(store: Mock) -> None:
    store.replay.return_value = 2

    assert decoded(api.handler(operator_event("POST /v1/jobs/{job_id}/replay"), None)) == (
        202,
        {"job_id": "job-1", "attempt": 2},
    )


def test_replay_reports_missing_and_non_replayable_jobs(store: Mock) -> None:
    event = operator_event("POST /v1/jobs/{job_id}/replay")
    store.replay.side_effect = KeyError("job-1")
    assert decoded(api.handler(event, None)) == (404, {"error": "job_not_found"})

    store.replay.side_effect = ClientError(
        {"Error": {"Code": "TransactionCanceledException", "Message": "condition"}},
        "TransactWriteItems",
    )
    assert decoded(api.handler(event, None)) == (409, {"error": "job_not_replayable"})


def test_unknown_authorized_route_returns_not_found(store: Mock) -> None:
    assert decoded(api.handler(operator_event("DELETE /v1/jobs/{job_id}"), None)) == (
        404,
        {"error": "route_not_found"},
    )
