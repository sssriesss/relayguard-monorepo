import type { WebhookDraft } from "@/domain/entities/Webhook";

export function generateWebhookDraft(): WebhookDraft {
  const id = crypto.randomUUID();
  return {
    source: "console",
    eventId: `evt_${id}`,
    eventType: "invoice.paid",
    data: JSON.stringify(
      {
        invoice_id: `inv_${id.slice(0, 8)}`,
        amount: Math.floor(Math.random() * 9000) + 1000,
        currency: "EUR",
        generated_at: new Date().toISOString(),
      },
      null,
      2,
    ),
  };
}
