import { ArrowDown, CheckCircle2 } from "lucide-react";
import { Panel } from "@/components/ui/Panel";

const steps = [
  "Verify signature",
  "Commit event",
  "Queue workflow",
  "Deliver safely",
];

export function EventJourney({ sending }: { sending: boolean }) {
  return (
    <Panel className="p-4 sm:p-5">
      <p className="text-[10px] font-bold tracking-[.16em] text-slate-500 uppercase">
        Connected journey
      </p>
      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] gap-2 sm:grid-cols-4 sm:items-center">
        {steps.map((step, index) => (
          <div key={step} className="contents sm:block">
            <div className="flex items-center gap-2 rounded-xl bg-white/[.025] p-3">
              <CheckCircle2
                className={`size-4 shrink-0 ${sending && index === 0 ? "animate-pulse text-cyan-300" : "text-slate-600"}`}
              />
              <span className="text-[11px] text-slate-300">{step}</span>
            </div>
            {index < steps.length - 1 && (
              <ArrowDown className="mx-auto size-3 text-slate-700 sm:hidden" />
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}
