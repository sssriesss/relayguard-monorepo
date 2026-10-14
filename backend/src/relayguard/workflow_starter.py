from __future__ import annotations

import json
import os
from datetime import UTC, datetime
from typing import Any

from botocore.exceptions import ClientError

from relayguard.aws import client, compact_json
from relayguard.domain import JobStatus


def _start(record: dict[str, Any], dynamodb: Any, stepfunctions: Any) -> None:
    message = json.loads(record["body"])
    job_id = str(message["job_id"])
    attempt = int(message["attempt"])
    now = datetime.now(UTC).isoformat()
    table_name = os.environ["JOBS_TABLE_NAME"]
    try:
        dynamodb.update_item(
            TableName=table_name,
            Key={"PK": {"S": f"JOB#{job_id}"}, "SK": {"S": "META"}},
            UpdateExpression=(
                "SET #status = :running, updated_at = :now, GSI1PK = :gsi_pk, GSI1SK = :gsi_sk"
            ),
            ConditionExpression=(
                "#status IN (:accepted, :queued, :running) AND attempt = :attempt"
            ),
            ExpressionAttributeNames={"#status": "status"},
            ExpressionAttributeValues={
                ":accepted": {"S": JobStatus.ACCEPTED},
                ":queued": {"S": JobStatus.QUEUED},
                ":running": {"S": JobStatus.RUNNING},
                ":attempt": {"N": str(attempt)},
                ":now": {"S": now},
                ":gsi_pk": {"S": f"STATUS#{JobStatus.RUNNING}"},
                ":gsi_sk": {"S": f"{now}#{job_id}"},
            },
        )
    except ClientError as exc:
        if exc.response.get("Error", {}).get("Code") == "ConditionalCheckFailedException":
            return
        raise

    try:
        stepfunctions.start_execution(
            stateMachineArn=os.environ["STATE_MACHINE_ARN"],
            name=f"{job_id}-{attempt}",
            input=compact_json({"job_id": job_id, "attempt": attempt}),
        )
    except ClientError as exc:
        if exc.response.get("Error", {}).get("Code") == "ExecutionAlreadyExists":
            return
        raise


def handler(event: dict[str, Any], _context: Any) -> dict[str, Any]:
    dynamodb = client("dynamodb")
    stepfunctions = client("stepfunctions")
    failures: list[dict[str, str]] = []
    for record in event.get("Records", []):
        try:
            _start(record, dynamodb, stepfunctions)
        except Exception:
            failures.append({"itemIdentifier": record.get("messageId", "unknown")})
    return {"batchItemFailures": failures}
