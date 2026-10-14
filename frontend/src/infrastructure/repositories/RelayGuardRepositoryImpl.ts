import type { RelayGuardConnection } from "@/domain/entities/Connection";
import { isJob, type Job } from "@/domain/entities/Job";
import type {
  AcceptedWebhook,
  WebhookPayload,
} from "@/domain/entities/Webhook";
import type { RelayGuardRepository } from "@/domain/repositories/RelayGuardRepository";
import { ApiError } from "@/infrastructure/errors/ApiError";

type Operation = "health" | "getJob" | "replayJob" | "sendWebhook";

export class RelayGuardRepositoryImpl implements RelayGuardRepository {
  constructor(private readonly connection: RelayGuardConnection) {}

  private async request<T>(
    operation: Operation,
    input: Record<string, unknown> = {},
  ): Promise<T> {
    const response = await fetch("/api/relayguard", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        operation,
        connection: this.connection,
        ...input,
      }),
    });
    const payload: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      const body = payload as { error?: string; message?: string };
      throw new ApiError(
        body.message || "RelayGuard request failed.",
        response.status,
        body.error,
      );
    }
    return payload as T;
  }

  async health(): Promise<void> {
    await this.request("health");
  }

  async getJob(jobId: string): Promise<Job> {
    const job = await this.request<unknown>("getJob", { jobId });
    if (!isJob(job))
      throw new ApiError("The API returned an invalid job.", 502);
    return job;
  }

  replayJob(jobId: string) {
    return this.request<{ job_id: string; attempt: number }>("replayJob", {
      jobId,
    });
  }

  sendWebhook(source: string, payload: WebhookPayload) {
    return this.request<AcceptedWebhook>("sendWebhook", { source, payload });
  }
}
