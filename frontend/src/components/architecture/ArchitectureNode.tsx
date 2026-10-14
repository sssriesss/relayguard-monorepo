import {
  Box,
  CloudCog,
  Database,
  GitBranch,
  Globe2,
  RadioTower,
  Send,
  ShieldCheck,
} from "lucide-react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

export type ArchitectureNodeData = {
  label: string;
  detail: string;
  kind: string;
  vertical: boolean;
};
export type ArchitectureFlowNode = Node<ArchitectureNodeData, "service">;

const icons = {
  producer: Send,
  api: Globe2,
  lambda: CloudCog,
  database: Database,
  queue: Box,
  workflow: GitBranch,
  event: RadioTower,
  target: ShieldCheck,
};

export function ArchitectureNode({ data }: NodeProps<ArchitectureFlowNode>) {
  const Icon = icons[data.kind as keyof typeof icons] || Box;
  return (
    <div className="w-40 rounded-2xl border border-white/10 bg-[#111827]/95 p-3 shadow-xl shadow-black/30">
      <Handle
        type="target"
        position={data.vertical ? Position.Top : Position.Left}
        className="!border-0 !bg-slate-500"
      />
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-cyan-300/10 text-cyan-300">
          <Icon className="size-4" />
        </span>
        <div>
          <p className="text-xs font-bold text-slate-100">{data.label}</p>
          <p className="mt-1 text-[10px] text-slate-500">{data.detail}</p>
        </div>
      </div>
      <Handle
        type="source"
        position={data.vertical ? Position.Bottom : Position.Right}
        className="!border-0 !bg-cyan-300"
      />
    </div>
  );
}
