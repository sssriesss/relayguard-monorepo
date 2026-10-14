export const jobStatuses = [
  "ACCEPTED",
  "QUEUED",
  "RUNNING",
  "SUCCEEDED",
  "FAILED",
  "UNSUPPORTED",
  "REVIEW_REQUIRED",
] as const;

export type JobStatus = (typeof jobStatuses)[number];

export type JobHistoryEntry = {
  type: string;
  outcome: string;
  attempt: number;
  created_at: string;
  error_code?: string;
};

export type Job = {
  job_id: string;
  source: string;
  event_type: string;
  status: JobStatus;
  attempt: number;
  received_at: string;
  updated_at: string;
  history: JobHistoryEntry[];
};

export const replayableStatuses: ReadonlySet<JobStatus> = new Set([
  "FAILED",
  "UNSUPPORTED",
  "REVIEW_REQUIRED",
]);

export function isJob(value: unknown): value is Job {
  if (!value || typeof value !== "object") return false;
  const job = value as Partial<Job>;
  return (
    typeof job.job_id === "string" &&
    typeof job.source === "string" &&
    typeof job.event_type === "string" &&
    typeof job.status === "string" &&
    jobStatuses.includes(job.status as JobStatus) &&
    typeof job.attempt === "number" &&
    Array.isArray(job.history)
  );
}
