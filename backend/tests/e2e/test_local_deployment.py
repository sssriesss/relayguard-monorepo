"""End-to-end tests for a RelayGuard deployment running on LocalStack."""

from __future__ import annotations

import hashlib
import hmac
import json
import re
import time
import urllib.error
import urllib.request
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import boto3
import pytest

REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
ENV_FILE = REPOSITORY_ROOT / "iac/env/local/_env.hcl"

pytestmark = pytest.mark.e2e


def hcl_string(name: str) -> str:
    match = re.search(
        rf'^\s*{re.escape(name)}\s*=\s*"([^"]+)"',
        ENV_FILE.read_text(encoding="utf-8"),
        re.MULTILINE,
    )
    if match is None:
        raise RuntimeError(f"missing {name} in {ENV_FILE}")
    return match.group(1)


def request(
    method: str,
    url: str,
    *,
    body: bytes | None = None,
    headers: dict[str, str] | None = None,
) -> tuple[int, dict[str, Any]]:
    req = urllib.request.Request(url, data=body, method=method, headers=headers or {})
    try:
        response = urllib.request.urlopen(req, timeout=15)
    except urllib.error.HTTPError as exc:
        response = exc
    payload = response.read()
    return response.status, json.loads(payload) if payload else {}


def signed_headers(body: bytes, secret: str) -> dict[str, str]:
    timestamp = str(int(time.time()))
    signature = hmac.new(
        secret.encode(), timestamp.encode() + b"." + body, hashlib.sha256
    ).hexdigest()
    return {
        "content-type": "application/json",
        "x-relayguard-timestamp": timestamp,
        "x-relayguard-signature": f"sha256={signature}",
    }


@dataclass(frozen=True)
class Deployment:
    base_url: str
    signing_secret: str
    operator_token: str
    dynamodb: Any
    jobs_table: str
    e2e_table: str

    @property
    def authorization(self) -> dict[str, str]:
        return {"authorization": f"Bearer {self.operator_token}"}


@pytest.fixture(scope="session")
def deployment() -> Deployment:
    endpoint = hcl_string("host_endpoint")
    region = hcl_string("aws_region")
    stage = hcl_string("environment")
    client_options = {
        "region_name": region,
        "endpoint_url": endpoint,
        "aws_access_key_id": hcl_string("access_key"),
        "aws_secret_access_key": hcl_string("secret_key"),
    }

    def client(service: str) -> Any:
        return boto3.client(service, **client_options)

    def parameter(name: str) -> str:
        return client("ssm").get_parameter(Name=f"/relayguard/{stage}/{name}")["Parameter"]["Value"]

    rest_apis = client("apigateway").get_rest_apis()["items"]
    api_id = next(api["id"] for api in rest_apis if api["name"] == f"{stage}-relayguard")
    secrets = client("secretsmanager")
    return Deployment(
        base_url=f"{endpoint}/_aws/execute-api/{api_id}/{stage}",
        signing_secret=secrets.get_secret_value(
            SecretId=parameter("infra/secrets/webhook_signing_arn")
        )["SecretString"],
        operator_token=secrets.get_secret_value(
            SecretId=parameter("infra/secrets/operator_token_arn")
        )["SecretString"],
        dynamodb=client("dynamodb"),
        jobs_table=parameter("infra/dynamodb/table_name"),
        e2e_table=f"relayguard-{stage}-e2e-state",
    )


def event_body(
    *,
    event_id: str | None = None,
    failures: int = 0,
    status: int = 500,
    marker: str = "default",
) -> bytes:
    return json.dumps(
        {
            "version": 1,
            "event_id": event_id or f"e2e-{uuid.uuid4()}",
            "event_type": "invoice.paid",
            "data": {
                "marker": marker,
                "relayguard_e2e": {"failures": failures, "status": status},
            },
        },
        separators=(",", ":"),
    ).encode()


def submit(deployment: Deployment, body: bytes) -> tuple[int, dict[str, Any]]:
    return request(
        "POST",
        f"{deployment.base_url}/v1/webhooks/e2e",
        body=body,
        headers=signed_headers(body, deployment.signing_secret),
    )


def get_job(deployment: Deployment, job_id: str) -> tuple[int, dict[str, Any]]:
    return request(
        "GET",
        f"{deployment.base_url}/v1/jobs/{job_id}",
        headers=deployment.authorization,
    )


def wait_for_terminal(
    deployment: Deployment,
    job_id: str,
    *,
    minimum_attempt: int = 1,
    timeout: int = 60,
) -> dict[str, Any]:
    deadline = time.monotonic() + timeout
    while True:
        status_code, job = get_job(deployment, job_id)
        assert status_code == 200
        if job["attempt"] >= minimum_attempt and job["status"] in {
            "SUCCEEDED",
            "FAILED",
            "REVIEW_REQUIRED",
            "UNSUPPORTED",
        }:
            return job
        if time.monotonic() >= deadline:
            raise TimeoutError(
                f"job {job_id} did not finish attempt {minimum_attempt}; "
                f"last state was {job['status']} attempt {job['attempt']}"
            )
        time.sleep(1)


def test_health(deployment: Deployment) -> None:
    assert request("GET", f"{deployment.base_url}/health") == (200, {"status": "ok"})


def test_webhook_rejects_invalid_signature(deployment: Deployment) -> None:
    body = json.dumps({"event_id": f"e2e-invalid-{uuid.uuid4()}"}).encode()
    status, _ = request(
        "POST",
        f"{deployment.base_url}/v1/webhooks/e2e",
        body=body,
        headers={
            "content-type": "application/json",
            "x-relayguard-timestamp": str(int(time.time())),
            "x-relayguard-signature": "sha256=invalid",
        },
    )
    assert status == 401


def test_webhook_rejects_invalid_contract_after_authentication(deployment: Deployment) -> None:
    body = json.dumps(
        {
            "version": 1,
            "event_id": f"e2e-invalid-contract-{uuid.uuid4()}",
            "event_type": "not.allowed",
            "data": {},
        },
        separators=(",", ":"),
    ).encode()

    status, result = submit(deployment, body)

    assert status == 400
    assert result["error"] == "invalid_request"


def test_operator_status_requires_auth_and_reports_missing_job(deployment: Deployment) -> None:
    url = f"{deployment.base_url}/v1/jobs/missing-{uuid.uuid4()}"

    assert request("GET", url, headers={"authorization": "Bearer wrong"}) == (
        403,
        {"error": "forbidden"},
    )
    assert request("GET", url, headers=deployment.authorization) == (
        404,
        {"error": "job_not_found"},
    )


def test_webhook_rejects_event_id_reused_with_different_payload(
    deployment: Deployment,
) -> None:
    event_id = f"e2e-conflict-{uuid.uuid4()}"
    first = event_body(event_id=event_id, marker="first")
    second = event_body(event_id=event_id, marker="second")

    first_status, first_result = submit(deployment, first)
    second_status, second_result = submit(deployment, second)

    assert first_status == 202
    assert first_result["duplicate"] is False
    assert second_status == 409
    assert second_result == {"error": "idempotency_conflict"}


def test_webhook_is_idempotent_and_completes_workflow(deployment: Deployment) -> None:
    body = event_body(failures=2, status=500)

    accepted_status, accepted = submit(deployment, body)
    assert accepted_status == 202
    assert accepted["duplicate"] is False
    job_id = accepted["job_id"]

    duplicate_status, duplicate = submit(deployment, body)
    assert duplicate_status == 202
    assert duplicate == {"job_id": job_id, "duplicate": True}

    job = wait_for_terminal(deployment, job_id)
    assert job["status"] == "SUCCEEDED", job
    assert [entry["type"] for entry in job["history"]] == [
        "JobAccepted",
        "DeliverySucceeded",
    ]
    delivery = deployment.dynamodb.get_item(
        TableName=deployment.e2e_table,
        Key={
            "PK": {"S": f"E2E#{job_id}:delivery:1"},
            "SK": {"S": "RESULT"},
        },
        ConsistentRead=True,
    )["Item"]
    assert delivery["request_count"] == {"N": "3"}
    assert delivery["final_status"] == {"N": "204"}


def test_failed_job_can_be_replayed_without_losing_history(deployment: Deployment) -> None:
    accepted_status, accepted = submit(
        deployment,
        event_body(failures=10, status=400),
    )
    assert accepted_status == 202
    job_id = accepted["job_id"]

    first_attempt = wait_for_terminal(deployment, job_id)
    assert first_attempt["status"] == "FAILED"
    assert first_attempt["attempt"] == 1
    assert [entry["type"] for entry in first_attempt["history"]] == [
        "JobAccepted",
        "DeliveryFailed",
    ]

    replay_status, replay = request(
        "POST",
        f"{deployment.base_url}/v1/jobs/{job_id}/replay",
        headers=deployment.authorization,
    )
    assert replay_status == 202
    assert replay == {"job_id": job_id, "attempt": 2}

    second_attempt = wait_for_terminal(deployment, job_id, minimum_attempt=2)
    assert second_attempt["status"] == "FAILED"
    assert second_attempt["attempt"] == 2
    assert [entry["type"] for entry in second_attempt["history"]] == [
        "JobAccepted",
        "DeliveryFailed",
        "JobReplayed",
        "DeliveryFailed",
    ]
