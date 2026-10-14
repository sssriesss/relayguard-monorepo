"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import type { RelayGuardConnection } from "@/domain/entities/Connection";
import { friendlyError } from "@/infrastructure/errors/ApiError";
import { RelayGuardRepositoryImpl } from "@/infrastructure/repositories/RelayGuardRepositoryImpl";
import { Button } from "./ui/Button";
import { Field, Input } from "./ui/Input";
import { useRelayGuard } from "./providers/RelayGuardProvider";

export function ConnectionDialog({
  canExplore,
  onClose,
}: {
  canExplore?: boolean;
  onClose(): void;
}) {
  const { connection, connect, connected, disconnect } = useRelayGuard();
  const [draft, setDraft] = useState<RelayGuardConnection>(connection);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState("");

  const update = (key: keyof RelayGuardConnection, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));

  async function save() {
    setTesting(true);
    setError("");
    try {
      const normalized = {
        ...draft,
        apiUrl: draft.apiUrl.trim().replace(/\/$/, ""),
      };
      await new RelayGuardRepositoryImpl(normalized).health();
      connect(normalized);
      onClose();
    } catch (caught) {
      setError(friendlyError(caught));
    } finally {
      setTesting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid items-start overflow-y-auto bg-slate-950/80 p-3 backdrop-blur-sm sm:place-items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Connect RelayGuard API"
    >
      <div className="my-2 w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-[#0a101c] shadow-2xl shadow-black/60 sm:my-0 sm:rounded-3xl">
        <div className="flex items-start justify-between border-b border-white/[.07] p-4 sm:p-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              Connect your RelayGuard API
            </h2>
            <p className="mt-1 max-w-md text-sm leading-6 text-slate-400">
              Credentials stay in this browser tab and are sent only through the
              local console adapter.
            </p>
          </div>
          {connected && (
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-white"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
          )}
        </div>
        <div className="grid gap-4 p-4 sm:gap-5 sm:p-6">
          <Field
            label="API base URL"
            hint="Required. Use the endpoint printed by the RelayGuard deployment."
          >
            <Input
              placeholder="http://localhost:4566/restapis/.../local/_user_request_"
              value={draft.apiUrl}
              onChange={(event) => update("apiUrl", event.target.value)}
            />
          </Field>
          <Field
            label="Operator token"
            hint="Used to inspect job history and replay failed deliveries."
          >
            <Input
              type="password"
              autoComplete="off"
              placeholder="Bearer token value"
              value={draft.operatorToken}
              onChange={(event) => update("operatorToken", event.target.value)}
            />
          </Field>
          <Field
            label="Webhook signing secret"
            hint="Used only to sign events submitted from the event lab."
          >
            <Input
              type="password"
              autoComplete="off"
              placeholder="HMAC secret value"
              value={draft.signingSecret}
              onChange={(event) => update("signingSecret", event.target.value)}
            />
          </Field>
          {error && (
            <p className="rounded-xl border border-rose-400/15 bg-rose-400/[.07] px-3 py-2.5 text-sm text-rose-200">
              {error}
            </p>
          )}
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-white/[.07] bg-white/[.015] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          {connected ? (
            <Button
              className="w-full sm:w-auto"
              variant="ghost"
              onClick={() => {
                disconnect();
                setDraft({ apiUrl: "", operatorToken: "", signingSecret: "" });
              }}
            >
              Disconnect
            </Button>
          ) : canExplore ? (
            <Button
              className="w-full sm:w-auto"
              variant="ghost"
              onClick={onClose}
            >
              Explore without API
            </Button>
          ) : (
            <span />
          )}
          <Button
            className="w-full sm:w-auto"
            onClick={save}
            loading={testing}
            disabled={!draft.apiUrl.trim()}
          >
            <Check className="size-4" /> Test and connect
          </Button>
        </div>
      </div>
    </div>
  );
}
