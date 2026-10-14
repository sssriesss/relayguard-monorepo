import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="flex items-center gap-3" href="/jobs">
      <span className="grid size-9 place-items-center rounded-xl bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-950/50">
        <ShieldCheck className="size-5" strokeWidth={2.4} />
      </span>
      {!compact && (
        <span className="text-left">
          <span className="block text-sm font-bold tracking-tight">
            RelayGuard
          </span>
          <span className="block text-[10px] font-semibold tracking-[.16em] text-slate-500 uppercase">
            Control plane
          </span>
        </span>
      )}
    </Link>
  );
}
