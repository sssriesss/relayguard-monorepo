"""Downstream endpoint that injects failures for the deployed E2E suite."""

from __future__ import annotations

import json
import os
from typing import Any

from relayguard.aws import client
from relayguard.http import header, request_body, response


def handler(event: dict[str, Any], _context: Any) -> dict[str, Any]:
    key = header(event, "idempotency-key")
    if not key:
        return response(400, {"error": "missing_idempotency_key"})
    payload = json.loads(request_body(event, 262_144))
    e2e = payload.get("data", {}).get("relayguard_e2e", {})
    failures = max(0, min(int(e2e.get("failures", 0)), 10))
    failure_status = int(e2e.get("status", 500))
    if failure_status not in {400, 408, 429, 500, 502, 503, 504}:
        return response(400, {"error": "invalid_e2e_status"})

    dynamodb = client("dynamodb")
    table = os.environ["E2E_STATE_TABLE_NAME"]
    result = dynamodb.update_item(
        TableName=table,
        Key={"PK": {"S": f"E2E#{key}"}, "SK": {"S": "RESULT"}},
        UpdateExpression=(
            "ADD request_count :one SET final_status = if_not_exists(final_status, :zero)"
        ),
        ExpressionAttributeValues={":one": {"N": "1"}, ":zero": {"N": "0"}},
        ReturnValues="ALL_NEW",
    )["Attributes"]
    count = int(result["request_count"]["N"])
    final_status = int(result["final_status"]["N"])
    if final_status:
        return response(final_status, {"duplicate": True, "request_count": count})
    if count <= failures:
        return response(failure_status, {"injected_failure": True, "request_count": count})

    success_status = 204
    dynamodb.update_item(
        TableName=table,
        Key={"PK": {"S": f"E2E#{key}"}, "SK": {"S": "RESULT"}},
        UpdateExpression="SET final_status = :status",
        ExpressionAttributeValues={":status": {"N": str(success_status)}},
    )
    return {"statusCode": success_status, "body": ""}
