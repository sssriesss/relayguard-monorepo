import pytest

from relayguard.config import Settings

REQUIRED_ENV = {
    "JOBS_TABLE_NAME": "jobs",
    "SIGNING_SECRET_ARN": "signing-secret",
    "OPERATOR_TOKEN_ARN": "operator-token",
    "ALLOWED_EVENT_TYPES": "invoice.paid, customer.updated",
}


def set_required_env(monkeypatch: pytest.MonkeyPatch) -> None:
    for name, value in REQUIRED_ENV.items():
        monkeypatch.setenv(name, value)


def test_settings_parse_required_values_and_defaults(monkeypatch: pytest.MonkeyPatch) -> None:
    set_required_env(monkeypatch)

    settings = Settings.from_env()

    assert settings.table_name == "jobs"
    assert settings.allowed_event_types == frozenset({"invoice.paid", "customer.updated"})
    assert settings.job_retention_days == 7
    assert settings.signature_tolerance_seconds == 300
    assert settings.max_body_bytes == 262_144


def test_settings_parse_numeric_overrides(monkeypatch: pytest.MonkeyPatch) -> None:
    set_required_env(monkeypatch)
    monkeypatch.setenv("JOB_RETENTION_DAYS", "30")
    monkeypatch.setenv("SIGNATURE_TOLERANCE_SECONDS", "60")
    monkeypatch.setenv("MAX_BODY_BYTES", "1024")

    settings = Settings.from_env()

    assert settings.job_retention_days == 30
    assert settings.signature_tolerance_seconds == 60
    assert settings.max_body_bytes == 1024


@pytest.mark.parametrize("missing", REQUIRED_ENV)
def test_settings_require_each_runtime_value(monkeypatch: pytest.MonkeyPatch, missing: str) -> None:
    set_required_env(monkeypatch)
    monkeypatch.delenv(missing)

    with pytest.raises(RuntimeError, match=missing):
        Settings.from_env()


def test_settings_reject_empty_event_type_list(monkeypatch: pytest.MonkeyPatch) -> None:
    set_required_env(monkeypatch)
    monkeypatch.setenv("ALLOWED_EVENT_TYPES", " , ")

    with pytest.raises(RuntimeError, match="at least one event type"):
        Settings.from_env()


@pytest.mark.parametrize("name", ["JOB_RETENTION_DAYS", "SIGNATURE_TOLERANCE_SECONDS"])
@pytest.mark.parametrize("value", ["0", "-1", "not-an-integer"])
def test_settings_reject_invalid_positive_integers(
    monkeypatch: pytest.MonkeyPatch, name: str, value: str
) -> None:
    set_required_env(monkeypatch)
    monkeypatch.setenv(name, value)

    with pytest.raises(RuntimeError, match=name):
        Settings.from_env()
