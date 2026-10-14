from datetime import UTC, datetime
from unittest.mock import Mock, call

import pytest
from botocore.exceptions import ClientError

from relayguard import normalize, outbox, reconcile, workflow_starter
from relayguard.domain import JobStatus


def client_error(code: str, operation: str = "Operation") -> ClientError:
    return ClientError({"Error": {"Code": code, "Message": "failed"}}, operation)


def test_normalize_builds_delivery_contract(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ALLOWED_EVENT_TYPES", "invoice.paid, customer.updated")
    item = {
        "job_id": {"S": "job-1"},
        "attempt": {"N": "2"},
        "provider_event_id": {"S": "evt-1"},
        "event_type": {"S": "invoice.paid"},
        "source": {"S": "billing"},
        "payload": {"S": '{"data":{"invoice_id":"inv-1"}}'},
    }

    assert normalize.handler({"item": item}, None) == {
        "job_id": "job-1",
        "attempt": 2,
        "event_id": "evt-1",
        "event_type": "invoice.paid",
        "source": "billing",
        "data": {"invoice_id": "inv-1"},
    }


def test_normalize_rejects_unsupported_event(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ALLOWED_EVENT_TYPES", "invoice.paid")
    item = {"event_type": {"S": "customer.deleted"}}

    with pytest.raises(normalize.UnsupportedEventError, match="not supported"):
        normalize.handler({"item": item}, None)


def test_outbox_sends_only_pending_insert_records(monkeypatch: pytest.MonkeyPatch) -> None:
    sqs = Mock()
    monkeypatch.setenv("WORK_QUEUE_URL", "queue-url")
    monkeypatch.setattr(outbox, "client", lambda service: sqs)
    event = {
        "Records": [
            {
                "eventID": "send-me",
                "eventName": "INSERT",
                "dynamodb": {
                    "NewImage": {
                        "SK": {"S": "PENDING"},
                        "job_id": {"S": "job-1"},
                        "attempt": {"N": "1"},
                        "source": {"S": "billing"},
                    }
                },
            },
            {"eventID": "ignore-me", "eventName": "MODIFY", "dynamodb": {}},
        ]
    }

    assert outbox.handler(event, None) == {"batchItemFailures": []}
    sqs.send_message.assert_called_once_with(
        QueueUrl="queue-url",
        MessageBody='{"attempt":1,"job_id":"job-1","source":"billing"}',
    )


def test_outbox_reports_only_failed_record(monkeypatch: pytest.MonkeyPatch) -> None:
    sqs = Mock()
    sqs.send_message.side_effect = RuntimeError("queue unavailable")
    monkeypatch.setenv("WORK_QUEUE_URL", "queue-url")
    monkeypatch.setattr(outbox, "client", lambda service: sqs)
    record = {
        "eventID": "failed-record",
        "eventName": "INSERT",
        "dynamodb": {
            "NewImage": {
                "SK": {"S": "PENDING"},
                "job_id": {"S": "job-1"},
                "attempt": {"N": "1"},
            }
        },
    }

    assert outbox.handler({"Records": [record]}, None) == {
        "batchItemFailures": [{"itemIdentifier": "failed-record"}]
    }


def test_workflow_start_marks_job_running_and_starts_execution(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    dynamodb = Mock()
    stepfunctions = Mock()
    monkeypatch.setenv("JOBS_TABLE_NAME", "jobs")
    monkeypatch.setenv("STATE_MACHINE_ARN", "state-machine")
    record = {"body": '{"job_id":"job-1","attempt":2}'}

    workflow_starter._start(record, dynamodb, stepfunctions)

    update = dynamodb.update_item.call_args.kwargs
    assert update["TableName"] == "jobs"
    assert update["ExpressionAttributeValues"][":attempt"] == {"N": "2"}
    stepfunctions.start_execution.assert_called_once_with(
        stateMachineArn="state-machine",
        name="job-1-2",
        input='{"attempt":2,"job_id":"job-1"}',
    )


def test_workflow_start_ignores_stale_delivery(monkeypatch: pytest.MonkeyPatch) -> None:
    dynamodb = Mock()
    dynamodb.update_item.side_effect = client_error("ConditionalCheckFailedException")
    stepfunctions = Mock()
    monkeypatch.setenv("JOBS_TABLE_NAME", "jobs")

    workflow_starter._start({"body": '{"job_id":"job-1","attempt":1}'}, dynamodb, stepfunctions)

    stepfunctions.start_execution.assert_not_called()


def test_workflow_start_treats_existing_execution_as_idempotent(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    dynamodb = Mock()
    stepfunctions = Mock()
    stepfunctions.start_execution.side_effect = client_error("ExecutionAlreadyExists")
    monkeypatch.setenv("JOBS_TABLE_NAME", "jobs")
    monkeypatch.setenv("STATE_MACHINE_ARN", "state-machine")

    workflow_starter._start({"body": '{"job_id":"job-1","attempt":1}'}, dynamodb, stepfunctions)

    dynamodb.update_item.assert_called_once()


def test_workflow_handler_reports_per_record_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    dynamodb = Mock()
    stepfunctions = Mock()
    monkeypatch.setattr(
        workflow_starter,
        "client",
        Mock(side_effect=[dynamodb, stepfunctions]),
    )
    monkeypatch.setattr(
        workflow_starter,
        "_start",
        Mock(side_effect=[None, RuntimeError("bad message")]),
    )
    event = {"Records": [{"messageId": "ok"}, {"messageId": "failed"}]}

    assert workflow_starter.handler(event, None) == {
        "batchItemFailures": [{"itemIdentifier": "failed"}]
    }


def stale_item(status: JobStatus = JobStatus.ACCEPTED) -> dict:
    return {
        "PK": {"S": "JOB#job-1"},
        "job_id": {"S": "job-1"},
        "attempt": {"N": "2"},
        "status": {"S": status},
        "expires_at": {"N": "1234"},
    }


def test_repair_requeues_accepted_or_queued_job() -> None:
    dynamodb = Mock()

    outcome = reconcile._repair(dynamodb, "jobs", stale_item(), datetime(2026, 1, 1, tzinfo=UTC))

    assert outcome == "requeued"
    written = dynamodb.put_item.call_args.kwargs["Item"]
    assert written["PK"] == {"S": "OUTBOX#job-1#2"}
    assert written["expires_at"] == {"N": "1234"}


def test_repair_detects_outbox_already_present() -> None:
    dynamodb = Mock()
    dynamodb.put_item.side_effect = client_error("ConditionalCheckFailedException")

    assert (
        reconcile._repair(dynamodb, "jobs", stale_item(), datetime(2026, 1, 1, tzinfo=UTC))
        == "already_queued"
    )


def test_repair_flags_stale_running_job_for_review() -> None:
    dynamodb = Mock()

    outcome = reconcile._repair(
        dynamodb,
        "jobs",
        stale_item(JobStatus.RUNNING),
        datetime(2026, 1, 1, tzinfo=UTC),
    )

    assert outcome == "flagged"
    values = dynamodb.update_item.call_args.kwargs["ExpressionAttributeValues"]
    assert values[":review"] == {"S": "REVIEW_REQUIRED"}
    assert values[":attempt"] == {"N": "2"}


def test_reconcile_queries_each_active_status_and_aggregates_repairs(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    dynamodb = Mock()
    dynamodb.query.side_effect = [
        {"Items": [{"result": "requeued"}]},
        {"Items": [{"result": "already_queued"}]},
        {"Items": [{"result": "flagged"}]},
    ]
    monkeypatch.setenv("JOBS_TABLE_NAME", "jobs")
    monkeypatch.setenv("STUCK_AFTER_MINUTES", "10")
    monkeypatch.setattr(reconcile, "client", lambda service: dynamodb)
    monkeypatch.setattr(reconcile, "_repair", lambda client, table, item, now: item["result"])

    assert reconcile.handler({}, None) == {
        "requeued": 1,
        "already_queued": 1,
        "flagged": 1,
    }
    queried_statuses = [
        invocation.kwargs["ExpressionAttributeValues"][":status"]["S"]
        for invocation in dynamodb.query.call_args_list
    ]
    assert queried_statuses == ["STATUS#ACCEPTED", "STATUS#QUEUED", "STATUS#RUNNING"]
    assert dynamodb.query.call_args_list[0] == call(
        TableName="jobs",
        IndexName="status-updated-index",
        KeyConditionExpression="GSI1PK = :status AND GSI1SK < :cutoff",
        ExpressionAttributeValues={
            ":status": {"S": "STATUS#ACCEPTED"},
            ":cutoff": dynamodb.query.call_args_list[0].kwargs["ExpressionAttributeValues"][
                ":cutoff"
            ],
        },
        Limit=25,
    )
