import type { Job } from "@/domain/entities/Job";
import type {
  AcceptedWebhook,
  WebhookPayload,
} from "@/domain/entities/Webhook";

export interface RelayGuardRepository {
  health(): Promise<void>;
  getJob(jobId: string): Promise<Job>;
  replayJob(jobId: string): Promise<{ job_id: string; attempt: number }>;
  sendWebhook(
    source: string,
    payload: WebhookPayload,
  ): Promise<AcceptedWebhook>;
}
