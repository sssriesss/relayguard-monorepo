import { describe, expect, it } from "vitest";
import type { Job } from "./Job";
import { getTransactionStages } from "./Transaction";

const job: Job = {
  job_id: "job-1",
  source: "console",
  event_type: "invoice.paid",
  status: "FAILED",
  attempt: 2,
  received_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:05Z",
  history: [
    {
      type: "JobAccepted",
      outcome: "accepted",
      attempt: 1,
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      type: "DeliveryFailed",
      outcome: "failed",
      attempt: 2,
      created_at: "2026-01-01T00:00:05Z",
      error_code: "PermanentDeliveryError",
    },
  ],
};

describe("getTransactionStages", () => {
  it("maps a failed transaction to an error destination", () => {
    const stages = getTransactionStages(job);
    expect(stages.map((stage) => stage.state)).toEqual([
      "complete",
      "complete",
      "complete",
      "complete",
      "error",
    ]);
    expect(stages.at(-1)?.evidence?.type).toBe("DeliveryFailed");
  });

  it("marks the delivery as current while a job is running", () => {
    expect(
      getTransactionStages({
        ...job,
        status: "RUNNING",
        history: job.history.slice(0, 1),
      }).at(-1)?.state,
    ).toBe("current");
  });

  it.each([
    ["ACCEPTED", ["complete", "complete", "current", "pending", "pending"]],
    ["QUEUED", ["complete", "complete", "complete", "current", "pending"]],
    ["SUCCEEDED", ["complete", "complete", "complete", "complete", "complete"]],
  ] as const)("maps %s to the expected path", (status, expected) => {
    expect(
      getTransactionStages({ ...job, status }).map((stage) => stage.state),
    ).toEqual(expected);
  });
});
