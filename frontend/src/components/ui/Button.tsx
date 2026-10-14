import type { ButtonHTMLAttributes } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/components/utils/cn";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
};

export function Button({
  className,
  variant = "primary",
  loading,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const variants = {
    primary:
      "bg-cyan-300 text-slate-950 hover:bg-cyan-200 shadow-[0_0_28px_rgba(103,232,249,.12)]",
    secondary:
      "border border-white/10 bg-white/[.06] text-white hover:bg-white/10",
    ghost: "text-slate-300 hover:bg-white/[.06] hover:text-white",
    danger:
      "border border-rose-400/20 bg-rose-400/10 text-rose-200 hover:bg-rose-400/15",
  };
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <LoaderCircle className="size-4 animate-spin" />}
      {children}
    </button>
  );
}
