import { Waypoints } from "lucide-react";
import type { JobHistoryEntry } from "@/domain/entities/Job";
import { Panel } from "@/components/ui/Panel";

const date = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "medium",
});

export function JobTimeline({ history }: { history: JobHistoryEntry[] }) {
  return (
    <Panel className="max-h-[660px] overflow-hidden p-4 sm:p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Event evidence</p>
          <p className="mt-1 text-xs text-slate-500">
            Immutable backend history
          </p>
        </div>
        <Waypoints className="size-5 text-slate-600" />
      </div>
      <div className="grid max-h-[570px] gap-2 overflow-y-auto pr-1">
        {history.map((entry, index) => (
          <div
            key={`${entry.created_at}-${entry.type}-${index}`}
            className="rounded-xl border border-white/[.06] bg-white/[.02] p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-xs font-semibold text-slate-200">
                {entry.type.replace(/([a-z])([A-Z])/g, "$1 $2")}
              </p>
              <time className="text-[10px] text-slate-500">
                {date.format(new Date(entry.created_at))}
              </time>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Attempt {entry.attempt} · {entry.outcome}
              {entry.error_code ? ` · ${entry.error_code}` : ""}
            </p>
          </div>
        ))}
      </div>
    </Panel>
  );
}
