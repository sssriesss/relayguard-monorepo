import base64
import json

import pytest

from relayguard.http import header, request_body, response


def test_response_builds_compact_json_response() -> None:
    result = response(202, {"accepted": True})

    assert result == {
        "statusCode": 202,
        "headers": {"content-type": "application/json"},
        "body": '{"accepted":true}',
    }


def test_request_body_decodes_plain_and_base64_payloads() -> None:
    assert request_body({"body": "hello"}, 5) == b"hello"
    assert (
        request_body({"body": base64.b64encode(b"hello").decode(), "isBase64Encoded": True}, 5)
        == b"hello"
    )


def test_request_body_rejects_payload_over_limit() -> None:
    with pytest.raises(ValueError, match="too large"):
        request_body({"body": "hello"}, 4)


def test_request_body_rejects_invalid_base64() -> None:
    with pytest.raises(ValueError):
        request_body({"body": "not base64!", "isBase64Encoded": True}, 100)


def test_header_lookup_is_case_insensitive_and_handles_missing_headers() -> None:
    assert header({"headers": {"Authorization": "Bearer token"}}, "authorization") == (
        "Bearer token"
    )
    assert header({}, "authorization") == ""


def test_response_body_is_valid_json() -> None:
    assert json.loads(response(400, {"error": "bad_request"})["body"]) == {"error": "bad_request"}
