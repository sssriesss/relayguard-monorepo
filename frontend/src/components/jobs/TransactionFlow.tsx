"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Background, MarkerType, ReactFlow, type Edge } from "@xyflow/react";
import type { Job } from "@/domain/entities/Job";
import {
  getTransactionStages,
  type TransactionStage,
} from "@/domain/entities/Transaction";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/components/utils/cn";
import { TransactionNode, type TransactionFlowNode } from "./TransactionNode";

const nodeTypes = { transaction: TransactionNode };
const time = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "medium",
});

export function TransactionFlow({ job }: { job: Job }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stages = useMemo(() => getTransactionStages(job), [job]);
  const [selected, setSelected] = useState<TransactionStage>(
    stages.find(
      (stage) => stage.state === "current" || stage.state === "error",
    ) || stages[0],
  );
  const [vertical, setVertical] = useState(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setVertical(entry.contentRect.width < 760),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const nodes = useMemo<TransactionFlowNode[]>(
    () =>
      stages.map((stage, index) => ({
        id: stage.id,
        type: "transaction",
        position: vertical
          ? { x: 18, y: index * 112 }
          : { x: index * 218, y: 40 },
        data: { ...stage, vertical },
      })),
    [stages, vertical],
  );

  const edges = useMemo<Edge[]>(
    () =>
      stages.slice(1).map((stage, index) => ({
        id: `${stages[index].id}-${stage.id}`,
        source: stages[index].id,
        target: stage.id,
        type: "smoothstep",
        animated: stage.state === "current",
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: stage.state === "pending" ? "#334155" : "#67e8f9",
        },
        style: {
          stroke: stage.state === "pending" ? "#334155" : "#67e8f9",
          strokeWidth: 1.5,
        },
      })),
    [stages],
  );

  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[.07] px-4 py-3 sm:px-5">
        <div>
          <p className="text-sm font-semibold">Transaction path</p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Select a stage to inspect its evidence
          </p>
        </div>
        <span className="max-w-full truncate rounded-lg bg-white/[.04] px-2.5 py-1 font-mono text-[10px] text-slate-400">
          {job.job_id}
        </span>
      </div>
      <div
        ref={containerRef}
        className={cn(vertical ? "h-[580px]" : "h-[300px]")}
      >
        <ReactFlow
          key={vertical ? "vertical" : "horizontal"}
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => setSelected(node.data)}
          fitView
          fitViewOptions={{ padding: vertical ? 0.15 : 0.08 }}
          minZoom={0.55}
          maxZoom={1.3}
          nodesDraggable={false}
          nodesConnectable={false}
          panOnDrag
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#1e293b" gap={24} size={1} />
        </ReactFlow>
      </div>
      <div className="grid gap-1 border-t border-white/[.07] bg-white/[.015] px-4 py-3 text-xs sm:grid-cols-[140px_1fr] sm:px-5">
        <span className="font-semibold text-slate-300">{selected.label}</span>
        <span className="text-slate-500">
          {selected.evidence
            ? `${selected.evidence.type} · ${time.format(new Date(selected.evidence.created_at))}`
            : selected.detail}
        </span>
      </div>
    </Panel>
  );
}
