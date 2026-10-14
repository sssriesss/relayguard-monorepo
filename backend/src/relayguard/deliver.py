from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from typing import Any

from relayguard.aws import SecretReader, client


class TransientDeliveryError(RuntimeError):
    pass


class PermanentDeliveryError(RuntimeError):
    pass


def _target_url() -> str:
    target = os.environ["EXTERNAL_TARGET_URL"].strip()
    if not target.startswith("https://"):
        raise RuntimeError("external delivery target must use HTTPS")
    return target


def _classify(status: int) -> None:
    if status == 429 or status == 408 or status >= 500:
        raise TransientDeliveryError(f"downstream returned retryable class {status // 100}xx")
    if status >= 400:
        raise PermanentDeliveryError(f"downstream returned terminal class {status // 100}xx")


def handler(event: dict[str, Any], _context: Any) -> dict[str, Any]:
    token = SecretReader(client("secretsmanager")).get(os.environ["OUTBOUND_TOKEN_ARN"])
    job_id = str(event["job_id"])
    attempt = int(event["attempt"])
    request_body = json.dumps(
        {
            "version": 1,
            "event_id": event["event_id"],
            "event_type": event["event_type"],
            "source": event["source"],
            "data": event["data"],
        },
        separators=(",", ":"),
    ).encode()
    request = urllib.request.Request(
        _target_url(),
        data=request_body,
        method="POST",
        headers={
            "content-type": "application/json",
            "authorization": f"Bearer {token}",
            "idempotency-key": f"{job_id}:delivery:{attempt}",
        },
    )
    try:
        # _target_url rejects every scheme except HTTPS before Request construction.
        with urllib.request.urlopen(request, timeout=10) as downstream:  # nosec B310
            status = downstream.status
    except urllib.error.HTTPError as exc:
        status = exc.code
    except (TimeoutError, urllib.error.URLError) as exc:
        raise TransientDeliveryError("downstream connection failed") from exc
    _classify(status)
    return {"status_code": status, "response_class": f"{status // 100}xx"}
