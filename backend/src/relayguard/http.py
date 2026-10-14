from __future__ import annotations

import base64
import json
from typing import Any


def response(status_code: int, payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "statusCode": status_code,
        "headers": {"content-type": "application/json"},
        "body": json.dumps(payload, separators=(",", ":")),
    }


def request_body(event: dict[str, Any], max_bytes: int) -> bytes:
    raw = event.get("body") or ""
    body = base64.b64decode(raw, validate=True) if event.get("isBase64Encoded") else raw.encode()
    if len(body) > max_bytes:
        raise ValueError("request body is too large")
    return body


def header(event: dict[str, Any], name: str) -> str:
    headers = {str(key).lower(): str(value) for key, value in (event.get("headers") or {}).items()}
    return headers.get(name.lower(), "")
