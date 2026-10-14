import { describe, expect, it } from "vitest";
import { isJob } from "./Job";

describe("isJob", () => {
  it("accepts the backend job contract", () => {
    expect(
      isJob({
        job_id: "id",
        source: "source",
        event_type: "type",
        status: "SUCCEEDED",
        attempt: 1,
        history: [],
      }),
    ).toBe(true);
  });

  it("rejects unknown statuses", () => {
    expect(
      isJob({
        job_id: "id",
        source: "source",
        event_type: "type",
        status: "UNKNOWN",
        attempt: 1,
        history: [],
      }),
    ).toBe(false);
  });
});
