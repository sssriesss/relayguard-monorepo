from __future__ import annotations

import os
from typing import Any

from relayguard.aws import client, compact_json, stream_new_image


def handler(event: dict[str, Any], _context: Any) -> dict[str, Any]:
    queue_url = os.environ["WORK_QUEUE_URL"]
    sqs = client("sqs")
    failures: list[dict[str, str]] = []
    for record in event.get("Records", []):
        try:
            message = stream_new_image(record)
            if message is not None:
                sqs.send_message(QueueUrl=queue_url, MessageBody=compact_json(message))
        except Exception:
            failures.append({"itemIdentifier": record.get("eventID", "unknown")})
    return {"batchItemFailures": failures}
