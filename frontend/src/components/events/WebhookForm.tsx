import { Fingerprint, Sparkles, Send } from "lucide-react";
import type { WebhookDraft } from "@/domain/entities/Webhook";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Panel } from "@/components/ui/Panel";

export function WebhookForm({
  draft,
  sending,
  onChange,
  onGenerate,
  onSubmit,
}: {
  draft: WebhookDraft;
  sending: boolean;
  onChange(key: keyof WebhookDraft, value: string): void;
  onGenerate(): void;
  onSubmit(event: React.FormEvent): void;
}) {
  return (
    <Panel className="overflow-hidden">
      <form onSubmit={onSubmit}>
        <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6">
          <Field label="Source" hint="Path segment">
            <Input
              value={draft.source}
              onChange={(event) => onChange("source", event.target.value)}
              placeholder="billing"
            />
          </Field>
          <Field label="Event type" hint="API allowlist">
            <Input
              value={draft.eventType}
              onChange={(event) => onChange("eventType", event.target.value)}
              placeholder="invoice.paid"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Event ID" hint="Idempotency key">
              <div className="relative">
                <Fingerprint className="absolute top-3 left-3 size-4 text-slate-500" />
                <Input
                  className="pl-10"
                  value={draft.eventId}
                  onChange={(event) => onChange("eventId", event.target.value)}
                  placeholder="Generate or enter an event ID"
                />
              </div>
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Event data" hint="JSON object">
              <Textarea
                rows={8}
                value={draft.data}
                onChange={(event) => onChange("data", event.target.value)}
                spellCheck={false}
              />
            </Field>
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-white/[.07] bg-white/[.015] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Button type="button" variant="ghost" onClick={onGenerate}>
            <Sparkles className="size-4" /> Generate example
          </Button>
          <Button type="submit" loading={sending}>
            <Send className="size-4" /> Send and track
          </Button>
        </div>
      </form>
    </Panel>
  );
}
