import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/components/utils/cn";

export const Panel = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function Panel({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-2xl border border-white/[.08] bg-slate-950/55 shadow-2xl shadow-black/10 backdrop-blur-xl",
          className,
        )}
        {...props}
      />
    );
  },
);
