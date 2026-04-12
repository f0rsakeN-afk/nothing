"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface AccountData {
  usage: {
    chats: number;
    projects: number;
    messages: number;
  };
}

async function fetchAccount(): Promise<AccountData> {
  const res = await fetch("/api/account");
  if (!res.ok) throw new Error("Failed to fetch account");
  return res.json();
}

export const UsageSection = React.memo(function UsageSection() {
  const { data, isLoading } = useQuery({
    queryKey: ["account"],
    queryFn: fetchAccount,
  });

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-32 rounded-lg bg-muted/20 animate-pulse" />
      </div>
    );
  }

  const stats = [
    { label: "Messages sent", value: (data?.usage.messages || 0).toLocaleString(), sub: "this month" },
    { label: "Chats", value: (data?.usage.chats || 0).toLocaleString(), sub: "total" },
    { label: "Projects", value: (data?.usage.projects || 0).toLocaleString(), sub: "total" },
  ] as const;

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
        {stats.map(({ label, value, sub }) => (
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
          Activity breakdown
        </p>
        <div className="rounded-lg border border-border/60 bg-muted/20 px-3 divide-y divide-border/40">
          {[
            { color: "bg-blue-500", label: "Chat completions", count: (data?.usage.messages || 0).toLocaleString() },
            { color: "bg-purple-500", label: "Chats", count: (data?.usage.chats || 0).toLocaleString() },
            { color: "bg-amber-400", label: "Projects", count: (data?.usage.projects || 0).toLocaleString() },
          ].map(({ color, label, count }) => (
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
