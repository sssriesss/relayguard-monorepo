import { ChevronDown } from "lucide-react";
import { Panel } from "@/components/ui/Panel";

const principles = [
  {
    index: "01",
    title: "Persist before acknowledge",
    text: "The intake transaction stores the job, idempotency lock, outbox item, and first history event together.",
  },
  {
    index: "02",
    title: "Retry with context",
    text: "Step Functions applies bounded backoff while every attempt remains visible in the job history.",
  },
  {
    index: "03",
    title: "Separate infrastructure",
    text: "Terraform and Serverless communicate through SSM instead of reading each other's state.",
  },
];

export function PrinciplesRail() {
  return (
    <Panel className="overflow-hidden">
      <div className="border-b border-white/[.07] px-4 py-3">
        <p className="text-[10px] font-bold tracking-[.16em] text-slate-500 uppercase">
          Design principles
        </p>
      </div>
      {principles.map((principle) => (
        <details
          key={principle.index}
          className="group border-b border-white/[.06] last:border-0"
        >
          <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
            <span className="font-mono text-[10px] text-cyan-300">
              {principle.index}
            </span>
            <span className="min-w-0 flex-1 text-xs font-semibold text-slate-200">
              {principle.title}
            </span>
            <ChevronDown className="size-3.5 text-slate-600 transition group-open:rotate-180" />
          </summary>
          <p className="px-4 pb-4 pl-12 text-[11px] leading-5 text-slate-500">
            {principle.text}
          </p>
        </details>
      ))}
    </Panel>
  );
}
