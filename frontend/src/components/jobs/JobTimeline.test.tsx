import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { JobTimeline } from "./JobTimeline";

describe("JobTimeline", () => {
  it("renders immutable backend events and error evidence", () => {
    render(
      <JobTimeline
        history={[
          {
            type: "JobAccepted",
            outcome: "accepted",
            attempt: 1,
            created_at: "2026-10-14T13:51:48Z",
          },
          {
            type: "DeliveryFailed",
            outcome: "failed",
            attempt: 2,
            created_at: "2026-10-14T13:52:05Z",
            error_code: "PermanentDeliveryError",
          },
        ]}
      />,
    );
    expect(screen.getByText("Event evidence")).toBeInTheDocument();
    expect(screen.getByText("Job Accepted")).toBeInTheDocument();
    expect(screen.getByText("Delivery Failed")).toBeInTheDocument();
    expect(
      screen.getByText("Attempt 2 · failed · PermanentDeliveryError"),
    ).toBeInTheDocument();
  });
});
