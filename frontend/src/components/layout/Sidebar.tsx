import Link from "next/link";
import { cn } from "@/components/utils/cn";
import { Brand } from "./Brand";
import { navigation, type AppView } from "./navigation";

export function Sidebar({
  view,
  connected,
  apiUrl,
  onConnect,
}: {
  view: AppView;
  connected: boolean;
  apiUrl: string;
  onConnect(): void;
}) {
  return (
    <aside className="sticky top-0 hidden h-screen border-r border-white/[.07] bg-slate-950/60 backdrop-blur-xl lg:block">
      <div className="flex h-17 items-center px-5">
        <Brand />
      </div>
      <nav className="mt-5 grid gap-1 px-3">
        {navigation.map(({ id, href, label, icon: Icon }) => (
          <Link
            key={id}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
              view === id
                ? "bg-white/[.08] text-white"
                : "text-slate-400 hover:bg-white/[.04] hover:text-slate-200",
            )}
          >
            <Icon className={cn("size-4", view === id && "text-cyan-300")} />
            {label}
          </Link>
        ))}
      </nav>
      <div className="absolute inset-x-3 bottom-4">
        <button
          onClick={onConnect}
          className="w-full rounded-2xl border border-white/[.08] bg-white/[.03] p-3 text-left transition hover:bg-white/[.06]"
        >
          <span className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-300">
            <span
              className={cn(
                "size-2 rounded-full",
                connected
                  ? "bg-emerald-400 shadow-[0_0_10px_#34d399]"
                  : "bg-slate-600",
              )}
            />
            {connected ? "API configured" : "Not connected"}
          </span>
          <span className="block truncate text-[11px] text-slate-500">
            {apiUrl || "Add an API endpoint"}
          </span>
        </button>
      </div>
    </aside>
  );
}
