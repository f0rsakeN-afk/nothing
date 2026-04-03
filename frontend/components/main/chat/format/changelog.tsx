"use client";

import { memo, useMemo } from "react";
import { Tag } from "lucide-react";
import { cn } from "@/lib/utils";

type ChangeType =
  | "added"
  | "improved"
  | "fixed"
  | "removed"
  | "breaking"
  | "deprecated"
  | "security";

interface Change {
  type: ChangeType;
  text: string;
}

interface Version {
  version: string;
  date?: string;
  tag?: string;
  changes: Change[];
}

interface ChangelogData {
  title?: string;
  versions: Version[];
}

const CHANGE_CFG: Record<ChangeType, { label: string; className: string }> = {
  added: {
    label: "Added",
    className:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  improved: {
    label: "Improved",
    className:
      "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  fixed: {
    label: "Fixed",
    className:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  removed: {
    label: "Removed",
    className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  },
  breaking: {
    label: "Breaking",
    className: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
  },
  deprecated: {
    label: "Deprecated",
    className:
      "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  },
  security: {
    label: "Security",
    className:
      "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
};

const TAG_CFG: Record<string, string> = {
  latest: "bg-primary/10 text-primary border-primary/25",
  stable:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  beta: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  alpha: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  rc: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
};

export const ChangelogVisualizer = memo(function ChangelogVisualizer({
  data,
}: {
  data: string;
}) {
  const parsed = useMemo((): ChangelogData | null => {
    try {
      const p = JSON.parse(data);
      if (!Array.isArray(p?.versions)) return null;
      return p as ChangelogData;
    } catch {
      return null;
    }
  }, [data]);

  if (!parsed) return null;

  return (
    <div className="my-6 overflow-hidden rounded-xl border border-border bg-card/50">
      <div className="flex items-center gap-2 border-b border-border/50 bg-muted/30 px-4 py-2.5">
        <Tag className="h-3.5 w-3.5 text-muted-foreground/50" />
        <span className="text-[13px] font-semibold text-foreground">
          {parsed.title ?? "Changelog"}
        </span>
      </div>

      <div className="divide-y divide-border/40">
        {parsed.versions.map((v, vi) => (
          <div key={vi} className="px-4 py-4">
            {/* Version header */}
            <div className="flex items-center gap-2.5 mb-3">
              <span className="font-mono text-[14px] font-bold text-foreground">
                v{v.version}
              </span>
              {v.tag && (
                <span
                  className={cn(
                    "text-[10px] font-semibold px-1.5 py-0.5 rounded-md border uppercase tracking-wide",
                    TAG_CFG[v.tag.toLowerCase()] ?? TAG_CFG.stable,
                  )}
                >
                  {v.tag}
                </span>
              )}
              {v.date && (
                <span className="ml-auto text-[11.5px] text-muted-foreground/45">
                  {v.date}
                </span>
              )}
            </div>

            {/* Changes */}
            <div className="space-y-2">
              {v.changes.map((change, ci) => {
                const cfg = CHANGE_CFG[change.type ?? "improved"];
                return (
                  <div key={ci} className="flex items-baseline gap-2.5">
                    <span
                      className={cn(
                        "shrink-0 rounded border px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide whitespace-normal wrap-break-word!",
                        cfg.className,
                      )}
                    >
                      {cfg.label}
                    </span>
                    <span className="text-[13px] text-foreground/75 leading-relaxed whitespace-normal wrap-break-word!">
                      {change.text}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
