import type { Job, JobHistoryEntry } from "./Job";

export type TransactionStageState =
  "complete" | "current" | "pending" | "error";

export type TransactionStage = {
  id: "intake" | "store" | "queue" | "workflow" | "delivery";
  label: string;
  detail: string;
  state: TransactionStageState;
  evidence?: JobHistoryEntry;
};

const terminalStatuses = new Set([
  "SUCCEEDED",
  "FAILED",
  "UNSUPPORTED",
  "REVIEW_REQUIRED",
]);

export function getTransactionStages(job: Job): TransactionStage[] {
  const accepted = job.history.find((entry) => entry.type === "JobAccepted");
  const delivery = [...job.history]
    .reverse()
    .find((entry) => entry.type.startsWith("Delivery"));
  const terminal = terminalStatuses.has(job.status);
  const deliveryState: TransactionStageState =
    job.status === "SUCCEEDED"
      ? "complete"
      : terminal
        ? "error"
        : job.status === "RUNNING"
          ? "current"
          : "pending";

  return [
    {
      id: "intake",
      label: "API intake",
      detail: `${job.event_type} from ${job.source}`,
      state: "complete",
      evidence: accepted,
    },
    {
      id: "store",
      label: "Durable store",
      detail: "Job and outbox committed",
      state: "complete",
      evidence: accepted,
    },
    {
      id: "queue",
      label: "Delivery queue",
      detail: `Attempt ${job.attempt} prepared`,
      state: job.status === "ACCEPTED" ? "current" : "complete",
    },
    {
      id: "workflow",
      label: "Workflow",
      detail: "Retry policy and delivery",
      state: terminal
        ? "complete"
        : job.status === "QUEUED"
          ? "current"
          : job.status === "RUNNING"
            ? "complete"
            : "pending",
    },
    {
      id: "delivery",
      label: "Destination",
      detail: delivery?.error_code || job.status.replaceAll("_", " "),
      state: deliveryState,
      evidence: delivery,
    },
  ];
}
