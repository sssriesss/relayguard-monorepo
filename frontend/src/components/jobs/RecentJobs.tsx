import Link from "next/link";
import { ArrowRight, History } from "lucide-react";
import { Panel } from "@/components/ui/Panel";

export function RecentJobs({ jobs }: { jobs: string[] }) {
  return (
    <Panel className="p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <History className="size-4 text-slate-500" />
        Recent jobs
      </div>
      {jobs.length ? (
        <div className="grid gap-1">
          {jobs.map((id) => (
            <Link
              key={id}
              href={`/jobs/${id}`}
              className="group flex items-center justify-between gap-3 rounded-xl px-3 py-3 text-xs text-slate-400 transition hover:bg-white/[.04] hover:text-white"
            >
              <span className="truncate font-mono">{id}</span>
              <ArrowRight className="size-3.5 shrink-0 opacity-0 transition group-hover:opacity-100" />
            </Link>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-xs leading-5 text-slate-500">
          Generated and inspected transactions appear here.
        </p>
      )}
    </Panel>
  );
}
