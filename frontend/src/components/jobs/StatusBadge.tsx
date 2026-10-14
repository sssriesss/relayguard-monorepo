import { Circle } from "lucide-react";
import type { JobStatus } from "@/domain/entities/Job";
import { cn } from "@/components/utils/cn";

const tones: Record<JobStatus, string> = {
  ACCEPTED: "bg-sky-400/10 text-sky-300 ring-sky-400/20",
  QUEUED: "bg-indigo-400/10 text-indigo-300 ring-indigo-400/20",
  RUNNING: "bg-amber-400/10 text-amber-300 ring-amber-400/20",
  SUCCEEDED: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/20",
  FAILED: "bg-rose-400/10 text-rose-300 ring-rose-400/20",
  UNSUPPORTED: "bg-orange-400/10 text-orange-300 ring-orange-400/20",
  REVIEW_REQUIRED: "bg-violet-400/10 text-violet-300 ring-violet-400/20",
};

export function StatusBadge({ status }: { status: JobStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide ring-1 ring-inset",
        tones[status],
      )}
    >
      <Circle className="size-1.5 fill-current" />
      {status.replaceAll("_", " ")}
    </span>
  );
}
