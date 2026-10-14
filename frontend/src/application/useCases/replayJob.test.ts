import { describe, expect, it, vi } from "vitest";
import type { RelayGuardRepository } from "@/domain/repositories/RelayGuardRepository";
import type { Job } from "@/domain/entities/Job";
import { replayJob } from "./replayJob";

const baseJob: Job = {
  job_id: "job-1",
  source: "billing",
  event_type: "invoice.paid",
  status: "FAILED",
  attempt: 1,
  received_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:01Z",
  history: [],
};

describe("replayJob", () => {
  it("delegates replayable jobs to the gateway", async () => {
    const repository = {
      replayJob: vi.fn().mockResolvedValue({ job_id: "job-1", attempt: 2 }),
    } as unknown as RelayGuardRepository;
    await expect(replayJob(repository, baseJob)).resolves.toEqual({
      job_id: "job-1",
      attempt: 2,
    });
    expect(repository.replayJob).toHaveBeenCalledWith("job-1");
  });

  it("blocks successful jobs before reaching the gateway", () => {
    const repository = {
      replayJob: vi.fn(),
    } as unknown as RelayGuardRepository;
    expect(() =>
      replayJob(repository, { ...baseJob, status: "SUCCEEDED" }),
    ).toThrow("cannot be replayed");
    expect(repository.replayJob).not.toHaveBeenCalled();
  });
});
