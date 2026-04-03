"use client";

import { memo, useMemo } from "react";
import { CheckCircle2, Circle, Loader2, Ban } from "lucide-react";
import { cn } from "@/lib/utils";

type ItemStatus = "done" | "in-progress" | "pending" | "blocked";

interface ChecklistItem {
  label: string;
  status?: ItemStatus;
  note?: string;
}

interface ChecklistData {
  title?: string;
  items: ChecklistItem[];
}

const ITEM_CFG = {
  done: {
    Icon: CheckCircle2,
    iconClass: "text-emerald-500",
    labelClass: "text-foreground/50 line-through",
  },
  "in-progress": {
    Icon: Loader2,
    iconClass: "text-blue-500 animate-spin",
    labelClass: "text-foreground",
  },
  pending: {
    Icon: Circle,
    iconClass: "text-muted-foreground/35",
    labelClass: "text-foreground/80",
  },
  blocked: {
    Icon: Ban,
    iconClass: "text-red-400",
    labelClass: "text-foreground/80",
  },
} satisfies Record<ItemStatus, object>;

export const ChecklistVisualizer = memo(function ChecklistVisualizer({
  data,
}: {
  data: string;
}) {
  const parsed = useMemo((): ChecklistData | null => {
    try {
      const p = JSON.parse(data);
      if (!Array.isArray(p?.items)) return null;
      return p as ChecklistData;
    } catch {
      return null;
    }
  }, [data]);

  if (!parsed) return null;

  const done = parsed.items.filter((i) => i.status === "done").length;
  const total = parsed.items.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="my-6 overflow-hidden rounded-xl border border-border bg-card/50">
      {/* Header + progress */}
      <div className="border-b border-border/50 bg-muted/30 px-4 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-semibold text-foreground">
            {parsed.title ?? "Checklist"}
          </span>
          <span className="text-[11.5px] text-muted-foreground/50">
            {done} / {total}
          </span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Items */}
      <div className="divide-y divide-border/25">
        {parsed.items.map((item, i) => {
          const cfg = ITEM_CFG[item.status ?? "pending"];
          const { Icon } = cfg;
          return (
            <div key={i} className="flex items-start gap-3 px-4 py-2.5">
              <Icon className={cn("h-4 w-4 shrink-0 mt-0.5", cfg.iconClass)} />
              <div className="min-w-0">
                <span className={cn("text-[13px]", cfg.labelClass)}>
                  {item.label}
                </span>
                {item.note && (
                  <p className="mt-0.5 text-[11.5px] text-muted-foreground/45">
                    {item.note}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
