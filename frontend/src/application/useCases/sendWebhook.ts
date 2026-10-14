import type { RelayGuardRepository } from "@/domain/repositories/RelayGuardRepository";
import { toWebhookPayload, type WebhookDraft } from "@/domain/entities/Webhook";

export function sendWebhook(
  repository: RelayGuardRepository,
  draft: WebhookDraft,
) {
  return repository.sendWebhook(draft.source.trim(), toWebhookPayload(draft));
}
