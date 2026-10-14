import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/components/utils/cn";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-200">
      <span>{label}</span>
      {hint && (
        <span className="-mt-1 text-xs font-normal leading-5 text-slate-500">
          {hint}
        </span>
      )}
      {children}
    </label>
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("field", className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "field min-h-28 resize-y font-mono text-xs leading-6",
        className,
      )}
      {...props}
    />
  );
}
