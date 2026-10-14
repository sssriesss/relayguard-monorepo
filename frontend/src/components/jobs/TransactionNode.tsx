import { Check, Clock3, CircleDashed, X } from "lucide-react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type {
  TransactionStage,
  TransactionStageState,
} from "@/domain/entities/Transaction";
import { cn } from "@/components/utils/cn";

export type TransactionNodeData = TransactionStage & { vertical: boolean };
export type TransactionFlowNode = Node<TransactionNodeData, "transaction">;

const stateStyle: Record<TransactionStageState, string> = {
  complete: "border-emerald-400/25 bg-emerald-400/[.07] text-emerald-300",
  current:
    "border-cyan-300/35 bg-cyan-300/[.09] text-cyan-200 shadow-[0_0_28px_rgba(34,211,238,.08)]",
  pending: "border-white/10 bg-slate-900/90 text-slate-500",
  error: "border-rose-400/30 bg-rose-400/[.08] text-rose-300",
};

const stateIcon = {
  complete: Check,
  current: Clock3,
  pending: CircleDashed,
  error: X,
};

export function TransactionNode({
  data,
  selected,
}: NodeProps<TransactionFlowNode>) {
  const Icon = stateIcon[data.state];
  return (
    <button
      className={cn(
        "w-44 rounded-2xl border p-3 text-left transition",
        stateStyle[data.state],
        selected && "ring-2 ring-white/20",
      )}
    >
      <Handle
        type="target"
        position={data.vertical ? Position.Top : Position.Left}
        className="!border-0 !bg-slate-600"
      />
      <div className="flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-lg bg-black/20">
          <Icon
            className={cn(
              "size-3.5",
              data.state === "current" && "animate-pulse",
            )}
          />
        </span>
        <span className="text-[10px] font-bold tracking-wide uppercase">
          {data.state}
        </span>
      </div>
      <p className="mt-3 text-xs font-bold text-slate-100">{data.label}</p>
      <p className="mt-1 truncate text-[10px] text-slate-500">{data.detail}</p>
      <Handle
        type="source"
        position={data.vertical ? Position.Bottom : Position.Right}
        className="!border-0 !bg-cyan-300"
      />
    </button>
  );
}
