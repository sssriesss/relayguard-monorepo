"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  type Edge,
} from "@xyflow/react";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/components/utils/cn";
import {
  ArchitectureNode,
  type ArchitectureFlowNode,
} from "./ArchitectureNode";
import { PrinciplesRail } from "./PrinciplesRail";

const services = [
  {
    id: "producer",
    label: "Webhook producer",
    detail: "Signed event",
    kind: "producer",
  },
  { id: "api", label: "API Gateway", detail: "Public intake", kind: "api" },
  {
    id: "lambda",
    label: "API Lambda",
    detail: "Verify and accept",
    kind: "lambda",
  },
  {
    id: "database",
    label: "DynamoDB",
    detail: "Job and outbox",
    kind: "database",
  },
  { id: "queue", label: "Amazon SQS", detail: "Durable queue", kind: "queue" },
  {
    id: "workflow",
    label: "Step Functions",
    detail: "Retry orchestration",
    kind: "workflow",
  },
  {
    id: "target",
    label: "HTTPS target",
    detail: "Idempotent receiver",
    kind: "target",
  },
  {
    id: "events",
    label: "EventBridge + SNS",
    detail: "Audit and alerts",
    kind: "event",
  },
];

const edge = (
  id: string,
  source: string,
  target: string,
  label?: string,
): Edge => ({
  id,
  source,
  target,
  label,
  type: "smoothstep",
  animated: id === "outbox",
  markerEnd: { type: MarkerType.ArrowClosed, color: "#475569" },
  style: { stroke: id === "outbox" ? "#67e8f9" : "#475569", strokeWidth: 1.5 },
  labelStyle: { fill: "#64748b", fontSize: 10 },
  labelBgStyle: { fill: "#060a12" },
});

const initialEdges = [
  edge("intake", "producer", "api", "HTTPS"),
  edge("invoke", "api", "lambda"),
  edge("persist", "lambda", "database", "transaction"),
  edge("outbox", "database", "queue", "stream"),
  edge("start", "queue", "workflow"),
  edge("deliver", "workflow", "target", "signed POST"),
  edge("observe", "workflow", "events"),
];

const horizontalPositions: Record<string, { x: number; y: number }> = {
  producer: { x: 0, y: 210 },
  api: { x: 190, y: 210 },
  lambda: { x: 380, y: 210 },
  database: { x: 570, y: 70 },
  queue: { x: 570, y: 350 },
  workflow: { x: 760, y: 210 },
  target: { x: 950, y: 70 },
  events: { x: 950, y: 350 },
};

export function ArchitectureFlow() {
  const container = useRef<HTMLDivElement>(null);
  const [vertical, setVertical] = useState(false);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setVertical(entry.contentRect.width < 760),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const nodes = useMemo<ArchitectureFlowNode[]>(
    () =>
      services.map((service, index) => ({
        id: service.id,
        type: "service",
        position: vertical
          ? { x: 20, y: index * 105 }
          : horizontalPositions[service.id],
        data: { ...service, vertical },
      })),
    [vertical],
  );
  const nodeTypes = useMemo(() => ({ service: ArchitectureNode }), []);
  return (
    <div className="grid gap-6">
      <section>
        <h2 className="text-3xl font-bold tracking-[-.035em] text-white md:text-4xl">
          Durability by design.
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
          Explore the request path and see where RelayGuard creates durable
          boundaries. Drag, pan, zoom, and follow the animated outbox handoff.
        </p>
      </section>
      <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_240px]">
        <Panel
          className={cn(
            "overflow-hidden bg-[#070c15]",
            vertical ? "h-[860px]" : "h-[620px]",
          )}
          ref={container}
        >
          <ReactFlow
            key={vertical ? "vertical" : "horizontal"}
            nodes={nodes}
            edges={initialEdges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.06 }}
            minZoom={0.55}
            maxZoom={1.4}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#1e293b" gap={28} size={1} />
            <Controls position="bottom-right" showInteractive={false} />
          </ReactFlow>
        </Panel>
        <aside className="xl:sticky xl:top-4">
          <PrinciplesRail />
        </aside>
      </div>
    </div>
  );
}
