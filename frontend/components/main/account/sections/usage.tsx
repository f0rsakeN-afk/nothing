"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const STATS = [
  { label: "Messages sent", value: "1,240", sub: "+12% this month" },
  { label: "Tokens used", value: "1.8M", sub: "of 3M limit" },
  { label: "Files analyzed", value: "47", sub: "23 MB total" },
  { label: "Web searches", value: "380", sub: "this month" },
] as const;

const ACTIVITY = [
  { color: "bg-blue-500", label: "Chat completions", count: "1,240" },
  { color: "bg-purple-500", label: "Web search", count: "380" },
  { color: "bg-amber-400", label: "File analysis", count: "130" },
] as const;

export const UsageSection = React.memo(function UsageSection() {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[13px] font-semibold text-foreground mb-0.5">
          Usage
        </h3>
        <p className="text-[12px] text-muted-foreground">
          A breakdown of your activity this month.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        {STATS.map(({ label, value, sub }) => (
          <div
            key={label}
            className="rounded-lg border border-border/60 bg-muted/20 p-3.5 space-y-0.5"
          >
            <p className="text-[11px] text-muted-foreground">{label}</p>
            <p className="text-[22px] font-bold text-foreground leading-none">
              {value}
            </p>
            <p className="text-[11px] text-muted-foreground/70">{sub}</p>
          </div>
        ))}
      </div>

      {/* Daily usage chart placeholder */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
          Over time
        </p>
        <div className="rounded-xl border border-border/60 bg-muted/20 h-28 flex items-center justify-center">
          <span className="text-[12px] text-muted-foreground/50">
            Usage over time
          </span>
        </div>
      </div>

      {/* Top activity */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
          Top activity
        </p>
        <div className="rounded-lg border border-border/60 bg-muted/20 px-3 divide-y divide-border/40">
          {ACTIVITY.map(({ color, label, count }) => (
            <div
              key={label}
              className="flex items-center justify-between gap-3 py-3"
            >
              <div className="flex items-center gap-2.5">
                <span className={cn("h-2 w-2 rounded-full shrink-0", color)} />
                <span className="text-[13px] text-foreground">{label}</span>
              </div>
              <span className="text-[12px] font-medium text-muted-foreground">
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
