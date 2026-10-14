from datetime import UTC, datetime
from unittest.mock import Mock

import pytest
from botocore.exceptions import ClientError

from relayguard.aws import JobStore, SecretReader, compact_json, stream_new_image
from relayguard.domain import ConflictError, WebhookEvent

NOW = datetime(2026, 1, 1, tzinfo=UTC)
EVENT = WebhookEvent(
    version=1,
    event_id="evt-1",
    event_type="invoice.paid",
    data={"invoice_id": "inv-1"},
)


def client_error(code: str, operation: str = "Operation") -> ClientError:
    return ClientError({"Error": {"Code": code, "Message": "failed"}}, operation)


def test_secret_reader_fetches_each_secret_once() -> None:
    secrets = Mock()
    secrets.get_secret_value.return_value = {"SecretString": "value"}
    reader = SecretReader(secrets)

    assert reader.get("secret-arn") == "value"
    assert reader.get("secret-arn") == "value"
    secrets.get_secret_value.assert_called_once_with(SecretId="secret-arn")


def test_secret_reader_rejects_binary_secret() -> None:
    secrets = Mock()
    secrets.get_secret_value.return_value = {"SecretBinary": b"value"}

    with pytest.raises(RuntimeError, match="binary secrets"):
        SecretReader(secrets).get("secret-arn")


def test_job_store_accept_writes_job_lock_outbox_and_history_atomically() -> None:
    dynamodb = Mock()
    store = JobStore(dynamodb, "jobs")

    result = store.accept(
        source="billing",
        event=EVENT,
        body=b'{"event_id":"evt-1"}',
        job_id="job-1",
        body_hash="hash-1",
        now=NOW,
        expires_at=1234,
    )

    assert result == ("job-1", False)
    writes = dynamodb.transact_write_items.call_args.kwargs["TransactItems"]
    assert [write.get("Put", {}).get("Item", {}).get("SK", {}).get("S") for write in writes] == [
        "META",
        "LOCK",
        "PENDING",
        "EVENT#2026-01-01T00:00:00+00:00#accepted",
    ]
    assert writes[0]["Put"]["Item"]["status"] == {"S": "ACCEPTED"}
    assert writes[2]["Put"]["Item"]["source"] == {"S": "billing"}


def test_job_store_accept_returns_existing_job_for_matching_duplicate() -> None:
    dynamodb = Mock()
    dynamodb.transact_write_items.side_effect = client_error("TransactionCanceledException")
    dynamodb.get_item.return_value = {
        "Item": {"job_id": {"S": "existing-job"}, "payload_hash": {"S": "same-hash"}}
    }

    result = JobStore(dynamodb, "jobs").accept(
        source="billing",
        event=EVENT,
        body=b"{}",
        job_id="new-job",
        body_hash="same-hash",
        now=NOW,
        expires_at=1234,
    )

    assert result == ("existing-job", True)
    assert dynamodb.get_item.call_args.kwargs["ConsistentRead"] is True


def test_job_store_accept_rejects_event_id_reused_with_different_payload() -> None:
    dynamodb = Mock()
    dynamodb.transact_write_items.side_effect = client_error("TransactionCanceledException")
    dynamodb.get_item.return_value = {
        "Item": {"job_id": {"S": "existing-job"}, "payload_hash": {"S": "old-hash"}}
    }

    with pytest.raises(ConflictError, match="different payload"):
        JobStore(dynamodb, "jobs").accept(
            source="billing",
            event=EVENT,
            body=b"{}",
            job_id="new-job",
            body_hash="new-hash",
            now=NOW,
            expires_at=1234,
        )


def test_job_store_accept_surfaces_unexpected_transaction_error() -> None:
    dynamodb = Mock()
    dynamodb.transact_write_items.side_effect = client_error("ProvisionedThroughputExceeded")

    with pytest.raises(ClientError):
        JobStore(dynamodb, "jobs").accept(
            source="billing",
            event=EVENT,
            body=b"{}",
            job_id="job-1",
            body_hash="hash-1",
            now=NOW,
            expires_at=1234,
        )


def test_job_store_accept_detects_cancelled_transaction_without_lock() -> None:
    dynamodb = Mock()
    dynamodb.transact_write_items.side_effect = client_error("TransactionCanceledException")
    dynamodb.get_item.return_value = {}

    with pytest.raises(RuntimeError, match="without an existing lock"):
        JobStore(dynamodb, "jobs").accept(
            source="billing",
            event=EVENT,
            body=b"{}",
            job_id="job-1",
            body_hash="hash-1",
            now=NOW,
            expires_at=1234,
        )


def test_job_store_get_returns_metadata_and_sorted_safe_history() -> None:
    dynamodb = Mock()
    dynamodb.query.return_value = {
        "Items": [
            {
                "PK": {"S": "JOB#job-1"},
                "SK": {"S": "META"},
                "job_id": {"S": "job-1"},
                "source": {"S": "billing"},
                "event_type": {"S": "invoice.paid"},
                "status": {"S": "FAILED"},
                "attempt": {"N": "2"},
                "received_at": {"S": "2026-01-01T00:00:00+00:00"},
                "updated_at": {"S": "2026-01-01T00:02:00+00:00"},
                "payload": {"S": "must-not-leak"},
            },
            {
                "SK": {"S": "EVENT#2#failed"},
                "type": {"S": "DeliveryFailed"},
                "outcome": {"S": "failed"},
                "attempt": {"N": "2"},
                "created_at": {"S": "2026-01-01T00:02:00+00:00"},
                "error_code": {"S": "PermanentDeliveryError"},
            },
            {
                "SK": {"S": "EVENT#1#accepted"},
                "type": {"S": "JobAccepted"},
                "outcome": {"S": "accepted"},
                "created_at": {"S": "2026-01-01T00:00:00+00:00"},
            },
        ]
    }

    job = JobStore(dynamodb, "jobs").get("job-1")

    assert job == {
        "job_id": "job-1",
        "source": "billing",
        "event_type": "invoice.paid",
        "status": "FAILED",
        "attempt": 2,
        "received_at": "2026-01-01T00:00:00+00:00",
        "updated_at": "2026-01-01T00:02:00+00:00",
        "history": [
            {
                "type": "JobAccepted",
                "outcome": "accepted",
                "attempt": 1,
                "created_at": "2026-01-01T00:00:00+00:00",
            },
            {
                "type": "DeliveryFailed",
                "outcome": "failed",
                "attempt": 2,
                "created_at": "2026-01-01T00:02:00+00:00",
                "error_code": "PermanentDeliveryError",
            },
        ],
    }
    assert "payload" not in job


def test_job_store_get_returns_none_when_metadata_is_missing() -> None:
    dynamodb = Mock()
    dynamodb.query.return_value = {"Items": []}

    assert JobStore(dynamodb, "jobs").get("missing") is None


def test_job_store_replay_increments_attempt_and_creates_outbox_and_history() -> None:
    dynamodb = Mock()
    dynamodb.get_item.return_value = {"Item": {"attempt": {"N": "2"}}}

    attempt = JobStore(dynamodb, "jobs").replay(job_id="job-1", now=NOW, expires_at=1234)

    assert attempt == 3
    writes = dynamodb.transact_write_items.call_args.kwargs["TransactItems"]
    assert writes[0]["Update"]["ExpressionAttributeValues"][":new_attempt"] == {"N": "3"}
    assert writes[1]["Put"]["Item"]["PK"] == {"S": "OUTBOX#job-1#3"}
    assert writes[2]["Put"]["Item"]["type"] == {"S": "JobReplayed"}


def test_job_store_replay_rejects_unknown_job() -> None:
    dynamodb = Mock()
    dynamodb.get_item.return_value = {}

    with pytest.raises(KeyError):
        JobStore(dynamodb, "jobs").replay(job_id="missing", now=NOW, expires_at=1234)


def test_stream_new_image_returns_compact_outbox_message() -> None:
    record = {
        "eventName": "INSERT",
        "dynamodb": {
            "NewImage": {
                "PK": {"S": "OUTBOX#job#1"},
                "SK": {"S": "PENDING"},
                "job_id": {"S": "job"},
                "attempt": {"N": "1"},
                "source": {"S": "billing"},
            }
        },
    }
    assert stream_new_image(record) == {"job_id": "job", "attempt": 1, "source": "billing"}


def test_stream_new_image_ignores_non_outbox_records() -> None:
    assert stream_new_image({"eventName": "MODIFY", "dynamodb": {}}) is None


def test_stream_new_image_ignores_insert_that_is_not_pending() -> None:
    record = {"eventName": "INSERT", "dynamodb": {"NewImage": {"SK": {"S": "META"}}}}

    assert stream_new_image(record) is None


def test_compact_json_is_stable_and_sorted() -> None:
    assert compact_json({"z": 1, "a": 2}) == '{"a":2,"z":1}'
