export type WebhookDraft = {
  source: string;
  eventId: string;
  eventType: string;
  data: string;
};

export type WebhookPayload = {
  version: 1;
  event_id: string;
  event_type: string;
  data: Record<string, unknown>;
};

export type AcceptedWebhook = {
  job_id: string;
  duplicate: boolean;
};

export function toWebhookPayload(draft: WebhookDraft): WebhookPayload {
  const data: unknown = JSON.parse(draft.data);
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Event data must be a JSON object.");
  }
  if (
    !draft.source.trim() ||
    !draft.eventId.trim() ||
    !draft.eventType.trim()
  ) {
    throw new Error("Source, event ID and event type are required.");
  }
  return {
    version: 1,
    event_id: draft.eventId.trim(),
    event_type: draft.eventType.trim(),
    data: data as Record<string, unknown>,
  };
}
