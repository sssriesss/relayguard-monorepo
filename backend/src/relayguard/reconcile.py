from __future__ import annotations

import os
from datetime import UTC, datetime, timedelta
from typing import Any

from botocore.exceptions import ClientError

from relayguard.aws import client
from relayguard.domain import JobStatus


def _repair(dynamodb: Any, table: str, item: dict[str, Any], now: datetime) -> str:
    job_id = item["job_id"]["S"]
    attempt = int(item["attempt"]["N"])
    status = JobStatus(item["status"]["S"])
    timestamp = now.isoformat()
    if status in {JobStatus.ACCEPTED, JobStatus.QUEUED}:
        try:
            dynamodb.put_item(
                TableName=table,
                Item={
                    "PK": {"S": f"OUTBOX#{job_id}#{attempt}"},
                    "SK": {"S": "PENDING"},
                    "job_id": {"S": job_id},
                    "attempt": {"N": str(attempt)},
                    "created_at": {"S": timestamp},
                    "expires_at": item["expires_at"],
                },
                ConditionExpression="attribute_not_exists(PK)",
            )
            return "requeued"
        except ClientError as exc:
            if exc.response.get("Error", {}).get("Code") == "ConditionalCheckFailedException":
                return "already_queued"
            raise

    dynamodb.update_item(
        TableName=table,
        Key={"PK": item["PK"], "SK": {"S": "META"}},
        UpdateExpression="SET #status = :review, updated_at = :now REMOVE GSI1PK, GSI1SK",
        ConditionExpression="#status = :running AND attempt = :attempt",
        ExpressionAttributeNames={"#status": "status"},
        ExpressionAttributeValues={
            ":review": {"S": JobStatus.REVIEW_REQUIRED},
            ":running": {"S": JobStatus.RUNNING},
            ":attempt": {"N": str(attempt)},
            ":now": {"S": timestamp},
        },
    )
    return "flagged"


def handler(_event: dict[str, Any], _context: Any) -> dict[str, Any]:
    dynamodb = client("dynamodb")
    table = os.environ["JOBS_TABLE_NAME"]
    now = datetime.now(UTC)
    cutoff = (now - timedelta(minutes=int(os.environ["STUCK_AFTER_MINUTES"]))).isoformat()
    results = {"requeued": 0, "already_queued": 0, "flagged": 0}
    for status in (JobStatus.ACCEPTED, JobStatus.QUEUED, JobStatus.RUNNING):
        page = dynamodb.query(
            TableName=table,
            IndexName="status-updated-index",
            KeyConditionExpression="GSI1PK = :status AND GSI1SK < :cutoff",
            ExpressionAttributeValues={
                ":status": {"S": f"STATUS#{status}"},
                ":cutoff": {"S": f"{cutoff}#~"},
            },
            Limit=25,
        )
        for item in page.get("Items", []):
            outcome = _repair(dynamodb, table, item, now)
            results[outcome] += 1
    return results
