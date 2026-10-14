import Link from "next/link";
import { Send, ShieldCheck } from "lucide-react";
import { Panel } from "@/components/ui/Panel";

export function JobsEmptyState() {
  return (
    <Panel className="relative min-h-64 overflow-hidden p-5 sm:min-h-72 sm:p-7">
      <div className="absolute -top-24 -right-16 size-64 rounded-full bg-cyan-300/[.06] blur-3xl" />
      <div className="relative flex h-full flex-col justify-between gap-10">
        <div className="grid size-11 place-items-center rounded-2xl border border-white/10 bg-white/[.04] text-cyan-300">
          <ShieldCheck className="size-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold">One job, one durable story</h3>
          <p className="mt-2 max-w-lg text-sm leading-6 text-slate-400">
            Inspect an existing ID or generate a fresh event and follow it
            directly into the transaction graph.
          </p>
          <Link
            className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.06] px-4 text-sm font-semibold text-white transition hover:bg-white/10"
            href="/events"
          >
            <Send className="size-4" />
            Generate transaction
          </Link>
        </div>
      </div>
    </Panel>
  );
}
