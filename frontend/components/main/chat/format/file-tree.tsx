"use client";

import { memo, useMemo } from "react";
import { Folder, File, FileCode, FileText, FileImage } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────

interface TreeNode {
  name: string;
  type: "file" | "dir";
  depth: number;
}

// ── Parser ─────────────────────────────────────────────────────────────────

function parseTree(raw: string): TreeNode[] {
  const lines = raw.split("\n").filter((l) => l.trim());
  const nodes: TreeNode[] = [];

  for (const line of lines) {
    // Strip all tree-drawing characters (│ ├ └ ─) and leading whitespace
    const stripped = line.replace(/^[│├└─\s]+/, "").trim();
    if (!stripped) continue;
    const prefixLen = line.length - line.replace(/^[│├└─\s]+/, "").length;
    const depth = Math.floor(prefixLen / 2);
    const isDir = stripped.endsWith("/");
    nodes.push({ name: stripped.replace(/\/$/, ""), type: isDir ? "dir" : "file", depth });
  }
  return nodes;
}

// ── Tree metadata ──────────────────────────────────────────────────────────
//
// For each node we compute:
//   isLast         — no next sibling at the same depth before depth rises
//   ancestorIsLast — for each ancestor depth [1..depth-1], was that ancestor last?
//                    Used to decide whether to draw a continuous │ guide or blank.

function computeMeta(nodes: TreeNode[]): {
  isLast: boolean[];
  ancestorLastMap: boolean[][];
} {
  const n = nodes.length;
  const isLast = new Array<boolean>(n).fill(true);

  for (let i = 0; i < n; i++) {
    const depth = nodes[i].depth;
    for (let j = i + 1; j < n; j++) {
      if (nodes[j].depth < depth) break;
      if (nodes[j].depth === depth) { isLast[i] = false; break; }
    }
  }

  // Walk forwards, keeping the last-seen isLast value per depth level.
  // When we reach node i at depth D, depthIsLast[d] for d < D reflects the
  // actual ancestor at that depth — exactly what we need for the guide lines.
  const depthIsLast: boolean[] = [];
  const ancestorLastMap: boolean[][] = [];

  for (let i = 0; i < n; i++) {
    const depth = nodes[i].depth;
    const snapshot: boolean[] = [];
    for (let d = 1; d < depth; d++) snapshot.push(depthIsLast[d] ?? true);
    ancestorLastMap.push(snapshot);
    depthIsLast[depth] = isLast[i];
  }

  return { isLast, ancestorLastMap };
}

// ── Icon ───────────────────────────────────────────────────────────────────

function FileIcon({ name, isDir }: { name: string; isDir: boolean }) {
  if (isDir) return <Folder className="h-3.5 w-3.5 shrink-0 text-amber-400/80" />;
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["tsx", "jsx"].includes(ext))
    return <FileCode className="h-3.5 w-3.5 shrink-0 text-sky-400/80" />;
  if (["ts", "js", "mjs", "cjs"].includes(ext))
    return <FileCode className="h-3.5 w-3.5 shrink-0 text-yellow-400/80" />;
  if (ext === "json")
    return <FileCode className="h-3.5 w-3.5 shrink-0 text-green-400/80" />;
  if (["md", "mdx", "txt"].includes(ext))
    return <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />;
  if (["png", "jpg", "jpeg", "svg", "webp", "gif"].includes(ext))
    return <FileImage className="h-3.5 w-3.5 shrink-0 text-purple-400/80" />;
  if (["css", "scss", "sass"].includes(ext))
    return <FileCode className="h-3.5 w-3.5 shrink-0 text-pink-400/80" />;
  return <File className="h-3.5 w-3.5 shrink-0 text-muted-foreground/45" />;
}

// ── Constants ──────────────────────────────────────────────────────────────

const GUIDE_W = 16;   // px — width of each indent column
const PIPE_X  = 7;    // px — horizontal centre of the │ / connector within a column

// ── Row ────────────────────────────────────────────────────────────────────

const TreeRow = memo(function TreeRow({
  node,
  isLast,
  ancestorIsLast,
}: {
  node: TreeNode;
  isLast: boolean;
  ancestorIsLast: boolean[];
}) {
  const isRoot = node.depth === 0;

  return (
    <div className="flex items-stretch h-6 min-w-0">
      {!isRoot && (
        <>
          {/* ── Ancestor guide columns ──────────────────────── */}
          {ancestorIsLast.map((ancIsLast, d) => (
            <div key={d} className="relative shrink-0" style={{ width: GUIDE_W }}>
              {!ancIsLast && (
                <div
                  className="absolute inset-y-0 border-l border-border/30"
                  style={{ left: PIPE_X }}
                />
              )}
            </div>
          ))}

          {/* ── ├── or └── connector ────────────────────────── */}
          <div className="relative shrink-0" style={{ width: GUIDE_W }}>
            {/* Vertical segment: full height if non-last, top-half only if last */}
            <div
              className="absolute border-l border-border/30"
              style={{ left: PIPE_X, top: 0, bottom: isLast ? "50%" : 0 }}
            />
            {/* Horizontal segment */}
            <div
              className="absolute border-t border-border/30"
              style={{ left: PIPE_X, right: 0, top: "50%" }}
            />
          </div>
        </>
      )}

      {/* ── Icon + label ────────────────────────────────────── */}
      <div className={cn("flex items-center gap-1.5 min-w-0", !isRoot && "pl-0.5")}>
        <FileIcon name={node.name} isDir={node.type === "dir"} />
        <span
          className={cn(
            "truncate text-[12.5px]",
            node.type === "dir"
              ? "font-medium text-foreground"
              : "text-foreground/70",
          )}
        >
          {node.name}
          {node.type === "dir" && (
            <span className="text-muted-foreground/35">/</span>
          )}
        </span>
      </div>
    </div>
  );
});

// ── Export ─────────────────────────────────────────────────────────────────

export const FileTreeVisualizer = memo(function FileTreeVisualizer({
  data,
}: {
  data: string;
}) {
  const nodes = useMemo(() => parseTree(data), [data]);
  const { isLast, ancestorLastMap } = useMemo(() => computeMeta(nodes), [nodes]);

  return (
    <div className="my-6 overflow-hidden rounded-xl border border-border bg-card/50">
      <div className="flex items-center gap-2 border-b border-border/50 bg-muted/30 px-4 py-2.5">
        <Folder className="h-3.5 w-3.5 text-muted-foreground/50" />
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
          File Tree
        </span>
      </div>
      <div className="overflow-x-auto px-4 py-3 font-mono">
        {nodes.map((node, i) => (
          <TreeRow
            key={i}
            node={node}
            isLast={isLast[i]}
            ancestorIsLast={ancestorLastMap[i]}
          />
        ))}
      </div>
    </div>
  );
});
