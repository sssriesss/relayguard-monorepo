import { describe, expect, it, vi } from "vitest";
import type { RelayGuardRepository } from "@/domain/repositories/RelayGuardRepository";
import { getJob } from "./getJob";

describe("getJob", () => {
  it("trims the job ID before delegating", async () => {
    const job = { job_id: "job-1" };
    const repository = {
      getJob: vi.fn().mockResolvedValue(job),
    } as unknown as RelayGuardRepository;
    await expect(getJob(repository, "  job-1  ")).resolves.toBe(job);
    expect(repository.getJob).toHaveBeenCalledWith("job-1");
  });

  it("rejects an empty job ID without calling the repository", () => {
    const repository = { getJob: vi.fn() } as unknown as RelayGuardRepository;
    expect(() => getJob(repository, "   ")).toThrow("Enter a job ID");
    expect(repository.getJob).not.toHaveBeenCalled();
  });
});
