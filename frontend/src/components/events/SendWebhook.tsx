"use client";

import { useState } from "react";
import { generateWebhookDraft } from "@/application/useCases/generateWebhookDraft";
import { sendWebhook } from "@/application/useCases/sendWebhook";
import type { WebhookDraft } from "@/domain/entities/Webhook";
import { friendlyError } from "@/infrastructure/errors/ApiError";
import { Panel } from "@/components/ui/Panel";
import { PageIntro } from "@/components/ui/PageIntro";
import { useRelayGuard } from "../providers/RelayGuardProvider";
import { EventJourney } from "./EventJourney";
import { WebhookForm } from "./WebhookForm";

const initialDraft: WebhookDraft = {
  source: "console",
  eventId: "",
  eventType: "invoice.paid",
  data: '{\n  "invoice_id": "inv_123",\n  "amount": 4990,\n  "currency": "EUR"\n}',
};

export function SendWebhook({
  onOpenJob,
  onConnect,
}: {
  onOpenJob(jobId: string): void;
  onConnect(): void;
}) {
  const { connected, connection, repository, rememberJob } = useRelayGuard();
  const [draft, setDraft] = useState(initialDraft);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const update = (key: keyof WebhookDraft, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!connected || !connection.signingSecret) return onConnect();
    setSending(true);
    setError("");
    try {
      const accepted = await sendWebhook(repository, draft);
      rememberJob(accepted.job_id);
      onOpenJob(accepted.job_id);
    } catch (caught) {
      setError(friendlyError(caught));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid gap-6">
      <PageIntro
        title="Generate a transaction."
        mutedTitle="Follow it end to end."
        description="Create a unique event, sign it with HMAC-SHA256, and move directly into its live delivery graph."
      />

      <EventJourney sending={sending} />
      <WebhookForm
        draft={draft}
        sending={sending}
        onChange={update}
        onGenerate={() => setDraft(generateWebhookDraft())}
        onSubmit={submit}
      />
      {error && (
        <Panel className="border-rose-400/15 bg-rose-400/[.04] p-4 text-sm leading-6 text-rose-200">
          {error}
        </Panel>
      )}
    </div>
  );
}
