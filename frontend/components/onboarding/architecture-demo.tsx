"use client";

import React, { useMemo } from "react";
import { 
  ReactFlow, 
  Handle, 
  Position, 
  type Node, 
  type Edge, 
  type NodeProps,
  BaseEdge,
  getBezierPath,
  type EdgeProps,
  type NodeTypes,
  type EdgeTypes
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Cpu, Database, Network } from "lucide-react";
import { cn } from "@/lib/utils";

type CustomNodeData = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

type AppNode = Node<CustomNodeData, "custom">;

// Custom Minimal Node Component
function CustomNode({ data, selected }: NodeProps<AppNode>) {
  const Icon = data.icon;
  return (
    <div 
      className={cn(
        "px-4 py-2 rounded-xl bg-background border border-border/50",
        "flex items-center gap-3 shadow-sm transition-all duration-300",
        selected && "border-primary/50 shadow-md shadow-primary/5"
      )}
    >
      <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center border border-primary/10">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <span className="text-[13px] font-bold tracking-tight text-foreground">{data.label}</span>
      <Handle type="target" position={Position.Left} className="w-0 h-0 border-none opacity-0" />
      <Handle type="source" position={Position.Right} className="w-0 h-0 border-none opacity-0" />
    </div>
  );
}

// Custom Minimal Edge Component
function CustomEdge(props: EdgeProps) {
  const [edgePath] = getBezierPath(props);
  return (
    <>
      <BaseEdge 
        path={edgePath} 
        style={{ stroke: "var(--border)", strokeWidth: 1.5, opacity: 0.4 }} 
      />
      <circle r="2" fill="currentColor" className="text-primary">
        <animateMotion dur="3s" repeatCount="indefinite" path={edgePath} />
      </circle>
    </>
  );
}

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
};

export function ArchitectureDemo() {
  const nodes: AppNode[] = useMemo(() => [
    {
      id: "engine",
      type: "custom",
      position: { x: 140, y: 50 },
      data: { label: "AI Engine", icon: Cpu },
    },
    {
      id: "docs",
      type: "custom",
      position: { x: 0, y: 0 },
      data: { label: "Source", icon: Network },
    },
    {
      id: "db",
      type: "custom",
      position: { x: 0, y: 100 },
      data: { label: "Index", icon: Database },
    },
  ], []);

  const edges: Edge[] = useMemo(() => [
    { id: "e1-2", source: "docs", target: "engine", type: "custom" },
    { id: "e1-3", source: "db", target: "engine", type: "custom" },
  ], []);

  return (
    <div className="h-full w-full pointer-events-none grayscale-[0.5] opacity-90 transition-all hover:grayscale-0 hover:opacity-100">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnScroll={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        onInit={(instance) => instance.fitView({ padding: 0.2 })}
        proOptions={{ hideAttribution: true }}
      />
    </div>
  );
}
