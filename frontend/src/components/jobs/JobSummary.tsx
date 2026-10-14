import { Clock3, Copy, RefreshCw, RotateCcw } from "lucide-react";
import type { Job } from "@/domain/entities/Job";
import { replayableStatuses } from "@/domain/entities/Job";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { StatusBadge } from "./StatusBadge";

const date = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "medium",
});

export function JobSummary({
  job,
  replaying,
  message,
  onRefresh,
  onReplay,
}: {
  job: Job;
  replaying: boolean;
  message: string;
  onRefresh(): void;
  onReplay(): void;
}) {
  const elapsed = Math.max(
    0,
    new Date(job.updated_at).getTime() - new Date(job.received_at).getTime(),
  );
  return (
    <Panel className="p-4 sm:p-6">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={job.status} />
            <span className="text-xs text-slate-500">
              Attempt {job.attempt}
            </span>
          </div>
          <div className="mt-4 flex min-w-0 items-center gap-2">
            <h2 className="truncate font-mono text-sm font-semibold text-white sm:text-lg">
              {job.job_id}
            </h2>
            <button
              onClick={() => navigator.clipboard.writeText(job.job_id)}
              className="shrink-0 text-slate-500 hover:text-white"
              aria-label="Copy job ID"
            >
              <Copy className="size-4" />
            </button>
          </div>
          <p className="mt-2 text-sm text-slate-400">
            <span className="text-slate-200">{job.event_type}</span> from{" "}
            {job.source}
          </p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Button
            className="flex-1 sm:flex-none"
            variant="secondary"
            onClick={onRefresh}
          >
            <RefreshCw className="size-4" /> Refresh
          </Button>
          {replayableStatuses.has(job.status) && (
            <Button
              className="flex-1 sm:flex-none"
              onClick={onReplay}
              loading={replaying}
            >
              <RotateCcw className="size-4" /> Replay
            </Button>
          )}
        </div>
      </div>
      {message && (
        <p className="mt-4 rounded-xl bg-white/[.04] px-3 py-2 text-sm text-slate-300">
          {message}
        </p>
      )}
      <div className="mt-5 grid gap-2 border-t border-white/[.07] pt-4 sm:grid-cols-3">
        <Metric
          label="Received"
          value={date.format(new Date(job.received_at))}
        />
        <Metric label="Updated" value={date.format(new Date(job.updated_at))} />
        <Metric
          label="Elapsed"
          value={
            elapsed < 1000
              ? `${elapsed} ms`
              : `${(elapsed / 1000).toFixed(1)} s`
          }
        />
      </div>
    </Panel>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/[.025] px-3 py-3">
      <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wide text-slate-500 uppercase">
        <Clock3 className="size-3" /> {label}
      </span>
      <span className="mt-1.5 block text-xs font-medium text-slate-300">
        {value}
      </span>
    </div>
  );
}
