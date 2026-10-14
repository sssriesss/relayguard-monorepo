import type { RelayGuardRepository } from "@/domain/repositories/RelayGuardRepository";
import type { Job } from "@/domain/entities/Job";

export function getJob(
  repository: RelayGuardRepository,
  jobId: string,
): Promise<Job> {
  const normalized = jobId.trim();
  if (!normalized) throw new Error("Enter a job ID.");
  return repository.getJob(normalized);
}
