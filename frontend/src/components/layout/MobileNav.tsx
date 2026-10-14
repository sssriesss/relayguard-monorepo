import Link from "next/link";
import { Settings2 } from "lucide-react";
import { cn } from "@/components/utils/cn";
import { navigation, type AppView } from "./navigation";

export function MobileNav({
  view,
  connected,
  onConnect,
}: {
  view: AppView;
  connected: boolean;
  onConnect(): void;
}) {
  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 rounded-2xl border border-white/10 bg-slate-950/90 p-1.5 shadow-2xl shadow-black/50 backdrop-blur-xl lg:hidden">
      {navigation.map(({ id, href, label, icon: Icon }) => (
        <Link
          key={id}
          href={href}
          className={cn(
            "flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-medium text-slate-500",
            view === id && "bg-white/[.07] text-cyan-200",
          )}
        >
          <Icon className="size-4" />
          {label}
        </Link>
      ))}
      <button
        onClick={onConnect}
        className="relative flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-medium text-slate-500"
      >
        <Settings2 className="size-4" />
        Connection
        <span
          className={cn(
            "absolute top-1.5 right-4 size-1.5 rounded-full",
            connected ? "bg-emerald-400" : "bg-slate-600",
          )}
        />
      </button>
    </nav>
  );
}
