from __future__ import annotations

import json
import os
from typing import Any


class UnsupportedEventError(ValueError):
    pass


def handler(event: dict[str, Any], _context: Any) -> dict[str, Any]:
    item = event["item"]
    event_type = item["event_type"]["S"]
    allowed = {value.strip() for value in os.environ["ALLOWED_EVENT_TYPES"].split(",")}
    if event_type not in allowed:
        raise UnsupportedEventError("event type is not supported")
    payload = json.loads(item["payload"]["S"])
    return {
        "job_id": item["job_id"]["S"],
        "attempt": int(item["attempt"]["N"]),
        "event_id": item["provider_event_id"]["S"],
        "event_type": event_type,
        "source": item["source"]["S"],
        "data": payload["data"],
    }
