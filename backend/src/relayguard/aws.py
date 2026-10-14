from __future__ import annotations

import json
from datetime import datetime
from typing import Any

import boto3
from botocore.exceptions import ClientError

from relayguard.domain import ConflictError, JobStatus, WebhookEvent


def client(service: str) -> Any:
    return boto3.client(service)


class SecretReader:
    def __init__(self, secrets_client: Any) -> None:
        self._client = secrets_client
        self._cache: dict[str, str] = {}

    def get(self, arn: str) -> str:
        if arn not in self._cache:
            response = self._client.get_secret_value(SecretId=arn)
            value = response.get("SecretString")
            if not isinstance(value, str):
                raise RuntimeError("binary secrets are not supported")
            self._cache[arn] = value
        return self._cache[arn]


class JobStore:
    def __init__(self, dynamodb_client: Any, table_name: str) -> None:
        self._client = dynamodb_client
        self._table_name = table_name

    def accept(
        self,
        *,
        source: str,
        event: WebhookEvent,
        body: bytes,
        job_id: str,
        body_hash: str,
        now: datetime,
        expires_at: int,
    ) -> tuple[str, bool]:
        timestamp = now.isoformat()
        job_key = f"JOB#{job_id}"
        lock_key = f"IDEMP#{source}#{event.event_id}"
        outbox_key = f"OUTBOX#{job_id}#1"
        try:
            self._client.transact_write_items(
                TransactItems=[
                    {
                        "Put": {
                            "TableName": self._table_name,
                            "Item": {
                                "PK": {"S": job_key},
                                "SK": {"S": "META"},
                                "job_id": {"S": job_id},
                                "source": {"S": source},
                                "provider_event_id": {"S": event.event_id},
                                "event_type": {"S": event.event_type},
                                "payload": {"S": body.decode()},
                                "payload_hash": {"S": body_hash},
                                "status": {"S": JobStatus.ACCEPTED},
                                "attempt": {"N": "1"},
                                "received_at": {"S": timestamp},
                                "updated_at": {"S": timestamp},
                                "expires_at": {"N": str(expires_at)},
                                "GSI1PK": {"S": f"STATUS#{JobStatus.ACCEPTED}"},
                                "GSI1SK": {"S": f"{timestamp}#{job_id}"},
                            },
                            "ConditionExpression": "attribute_not_exists(PK)",
                        }
                    },
                    {
                        "Put": {
                            "TableName": self._table_name,
                            "Item": {
                                "PK": {"S": lock_key},
                                "SK": {"S": "LOCK"},
                                "job_id": {"S": job_id},
                                "payload_hash": {"S": body_hash},
                                "expires_at": {"N": str(expires_at)},
                            },
                            "ConditionExpression": "attribute_not_exists(PK)",
                        }
                    },
                    {
                        "Put": {
                            "TableName": self._table_name,
                            "Item": {
                                "PK": {"S": outbox_key},
                                "SK": {"S": "PENDING"},
                                "job_id": {"S": job_id},
                                "attempt": {"N": "1"},
                                "source": {"S": source},
                                "created_at": {"S": timestamp},
                                "expires_at": {"N": str(expires_at)},
                            },
                            "ConditionExpression": "attribute_not_exists(PK)",
                        }
                    },
                    {
                        "Put": {
                            "TableName": self._table_name,
                            "Item": {
                                "PK": {"S": job_key},
                                "SK": {"S": f"EVENT#{timestamp}#accepted"},
                                "type": {"S": "JobAccepted"},
                                "outcome": {"S": "accepted"},
                                "attempt": {"N": "1"},
                                "created_at": {"S": timestamp},
                                "expires_at": {"N": str(expires_at)},
                            },
                        }
                    },
                ]
            )
            return job_id, False
        except ClientError as exc:
            if exc.response.get("Error", {}).get("Code") != "TransactionCanceledException":
                raise

        existing = self._client.get_item(
            TableName=self._table_name,
            Key={"PK": {"S": lock_key}, "SK": {"S": "LOCK"}},
            ConsistentRead=True,
        ).get("Item")
        if not existing:
            raise RuntimeError("idempotency transaction was cancelled without an existing lock")
        if existing["payload_hash"]["S"] != body_hash:
            raise ConflictError("event_id was already used with a different payload")
        return existing["job_id"]["S"], True

    def get(self, job_id: str) -> dict[str, Any] | None:
        response = self._client.query(
            TableName=self._table_name,
            KeyConditionExpression="PK = :pk",
            ExpressionAttributeValues={":pk": {"S": f"JOB#{job_id}"}},
            ConsistentRead=True,
        )
        items = response.get("Items", [])
        metadata = next((item for item in items if item["SK"]["S"] == "META"), None)
        if metadata is None:
            return None
        history = [
            {
                "type": item["type"]["S"],
                "outcome": item["outcome"]["S"],
                "attempt": int(item.get("attempt", {"N": "1"})["N"]),
                "created_at": item["created_at"]["S"],
                **({"error_code": item["error_code"]["S"]} if "error_code" in item else {}),
            }
            for item in items
            if item["SK"]["S"].startswith("EVENT#")
        ]
        history.sort(key=lambda entry: entry["created_at"])
        return {
            "job_id": metadata["job_id"]["S"],
            "source": metadata["source"]["S"],
            "event_type": metadata["event_type"]["S"],
            "status": metadata["status"]["S"],
            "attempt": int(metadata["attempt"]["N"]),
            "received_at": metadata["received_at"]["S"],
            "updated_at": metadata["updated_at"]["S"],
            "history": history,
        }

    def replay(self, *, job_id: str, now: datetime, expires_at: int) -> int:
        current = self._client.get_item(
            TableName=self._table_name,
            Key={"PK": {"S": f"JOB#{job_id}"}, "SK": {"S": "META"}},
            ConsistentRead=True,
        ).get("Item")
        if not current:
            raise KeyError(job_id)
        old_attempt = int(current["attempt"]["N"])
        new_attempt = old_attempt + 1
        timestamp = now.isoformat()
        self._client.transact_write_items(
            TransactItems=[
                {
                    "Update": {
                        "TableName": self._table_name,
                        "Key": {"PK": {"S": f"JOB#{job_id}"}, "SK": {"S": "META"}},
                        "UpdateExpression": (
                            "SET #status = :accepted, attempt = :new_attempt, updated_at = :now, "
                            "GSI1PK = :gsi_pk, GSI1SK = :gsi_sk"
                        ),
                        "ConditionExpression": (
                            "#status IN (:failed, :unsupported, :review) AND attempt = :old_attempt"
                        ),
                        "ExpressionAttributeNames": {"#status": "status"},
                        "ExpressionAttributeValues": {
                            ":accepted": {"S": JobStatus.ACCEPTED},
                            ":failed": {"S": JobStatus.FAILED},
                            ":unsupported": {"S": JobStatus.UNSUPPORTED},
                            ":review": {"S": JobStatus.REVIEW_REQUIRED},
                            ":old_attempt": {"N": str(old_attempt)},
                            ":new_attempt": {"N": str(new_attempt)},
                            ":now": {"S": timestamp},
                            ":gsi_pk": {"S": f"STATUS#{JobStatus.ACCEPTED}"},
                            ":gsi_sk": {"S": f"{timestamp}#{job_id}"},
                        },
                    }
                },
                {
                    "Put": {
                        "TableName": self._table_name,
                        "Item": {
                            "PK": {"S": f"OUTBOX#{job_id}#{new_attempt}"},
                            "SK": {"S": "PENDING"},
                            "job_id": {"S": job_id},
                            "attempt": {"N": str(new_attempt)},
                            "created_at": {"S": timestamp},
                            "expires_at": {"N": str(expires_at)},
                        },
                        "ConditionExpression": "attribute_not_exists(PK)",
                    }
                },
                {
                    "Put": {
                        "TableName": self._table_name,
                        "Item": {
                            "PK": {"S": f"JOB#{job_id}"},
                            "SK": {"S": f"EVENT#{timestamp}#replay-{new_attempt}"},
                            "type": {"S": "JobReplayed"},
                            "outcome": {"S": "accepted"},
                            "attempt": {"N": str(new_attempt)},
                            "created_at": {"S": timestamp},
                            "expires_at": {"N": str(expires_at)},
                        },
                    }
                },
            ]
        )
        return new_attempt


def stream_new_image(record: dict[str, Any]) -> dict[str, Any] | None:
    if record.get("eventName") != "INSERT":
        return None
    image = record.get("dynamodb", {}).get("NewImage", {})
    if image.get("SK", {}).get("S") != "PENDING":
        return None
    return {
        "job_id": image["job_id"]["S"],
        "attempt": int(image["attempt"]["N"]),
        **({"source": image["source"]["S"]} if "source" in image else {}),
    }


def compact_json(value: object) -> str:
    return json.dumps(value, separators=(",", ":"), sort_keys=True)
