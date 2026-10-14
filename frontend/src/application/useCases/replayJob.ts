import type { RelayGuardRepository } from "@/domain/repositories/RelayGuardRepository";
import { replayableStatuses, type Job } from "@/domain/entities/Job";

export function replayJob(repository: RelayGuardRepository, job: Job) {
  if (!replayableStatuses.has(job.status)) {
    throw new Error(`Jobs in ${job.status} cannot be replayed.`);
  }
  return repository.replayJob(job.job_id);
}
