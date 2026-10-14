import json
import urllib.error
from unittest.mock import MagicMock, Mock

import pytest

from relayguard import deliver
from relayguard.deliver import (
    PermanentDeliveryError,
    TransientDeliveryError,
    _classify,
    _target_url,
)


def test_target_url_uses_configured_https_endpoint(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("EXTERNAL_TARGET_URL", "https://receiver.example.test/events")

    assert _target_url() == "https://receiver.example.test/events"


def test_target_url_rejects_insecure_endpoint(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("EXTERNAL_TARGET_URL", "http://receiver.example.test/events")

    with pytest.raises(RuntimeError, match="must use HTTPS"):
        _target_url()


def delivery_event() -> dict:
    return {
        "job_id": "job-1",
        "attempt": 2,
        "event_id": "evt-1",
        "event_type": "invoice.paid",
        "source": "billing",
        "data": {"invoice_id": "inv-1"},
    }


def configure_handler(monkeypatch: pytest.MonkeyPatch) -> Mock:
    secrets = Mock()
    secrets.get_secret_value.return_value = {"SecretString": "outbound-token"}
    monkeypatch.setenv("EXTERNAL_TARGET_URL", "https://receiver.example.test/events")
    monkeypatch.setenv("OUTBOUND_TOKEN_ARN", "outbound-token-arn")
    monkeypatch.setattr(deliver, "client", lambda service: secrets)
    return secrets


def test_handler_posts_normalized_event_with_auth_and_idempotency_headers(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    configure_handler(monkeypatch)
    downstream = MagicMock()
    downstream.__enter__.return_value.status = 204
    urlopen = Mock(return_value=downstream)
    monkeypatch.setattr(deliver.urllib.request, "urlopen", urlopen)

    assert deliver.handler(delivery_event(), None) == {
        "status_code": 204,
        "response_class": "2xx",
    }
    request = urlopen.call_args.args[0]
    assert request.full_url == "https://receiver.example.test/events"
    assert request.method == "POST"
    assert json.loads(request.data) == {
        "version": 1,
        "event_id": "evt-1",
        "event_type": "invoice.paid",
        "source": "billing",
        "data": {"invoice_id": "inv-1"},
    }
    assert request.get_header("Authorization") == "Bearer outbound-token"
    assert request.get_header("Idempotency-key") == "job-1:delivery:2"
    assert urlopen.call_args.kwargs == {"timeout": 10}


def test_handler_classifies_http_error_response(monkeypatch: pytest.MonkeyPatch) -> None:
    configure_handler(monkeypatch)
    error = urllib.error.HTTPError(
        "https://receiver.example.test/events", 422, "unprocessable", {}, None
    )
    monkeypatch.setattr(deliver.urllib.request, "urlopen", Mock(side_effect=error))

    with pytest.raises(PermanentDeliveryError, match="4xx"):
        deliver.handler(delivery_event(), None)


def test_handler_translates_connection_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    configure_handler(monkeypatch)
    monkeypatch.setattr(
        deliver.urllib.request,
        "urlopen",
        Mock(side_effect=urllib.error.URLError("connection refused")),
    )

    with pytest.raises(TransientDeliveryError, match="connection failed"):
        deliver.handler(delivery_event(), None)


@pytest.mark.parametrize("status", [200, 202, 204, 301])
def test_delivery_success_classes(status: int) -> None:
    _classify(status)


@pytest.mark.parametrize("status", [408, 429, 500, 503])
def test_delivery_retryable_classes(status: int) -> None:
    with pytest.raises(TransientDeliveryError):
        _classify(status)


@pytest.mark.parametrize("status", [400, 401, 404, 422])
def test_delivery_terminal_classes(status: int) -> None:
    with pytest.raises(PermanentDeliveryError):
        _classify(status)
