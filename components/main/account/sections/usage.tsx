"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface AccountData {
  usage: {
    chats: number;
    projects: number;
    messages: number;
    files: number;
  };
  monthlyUsage: {
    chats: number;
    messages: number;
  };
}

async function fetchAccount(): Promise<AccountData> {
  const res = await fetch("/api/account", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch account");
  return res.json();
}

interface UsageSectionProps {
  accountData?: AccountData;
}

function UsageSkeleton() {
  return (
    <div className="space-y-5">
      <div>
        <Skeleton className="h-4 w-20 mb-1" />
        <Skeleton className="h-3 w-52" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-32 mb-1" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    </div>
  );
}

export const UsageSection = React.memo(function UsageSection({
  accountData,
}: UsageSectionProps) {
  const { data: localData, isLoading } = useQuery({
    queryKey: ["account"],
    queryFn: fetchAccount,
    enabled: !accountData,
    staleTime: 30000,
  });

  const data = accountData || localData;
  const isFetching = !accountData && isLoading;

  if (isFetching || !data) {
    return <UsageSkeleton />;
  }

  const stats = [
    { label: "Messages", value: (data?.monthlyUsage?.messages || 0).toLocaleString(), sub: "this month" },
    { label: "Chats", value: (data?.monthlyUsage?.chats || 0).toLocaleString(), sub: "this month" },
    { label: "Total chats", value: (data?.usage?.chats || 0).toLocaleString(), sub: "all time" },
    { label: "Total projects", value: (data?.usage?.projects || 0).toLocaleString(), sub: "all time" },
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

      {/* Top activity */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
          Activity breakdown
        </p>
        <div className="rounded-lg border border-border/60 bg-muted/20 px-3 divide-y divide-border/40">
          {[
            { color: "bg-blue-500", label: "Messages this month", count: (data?.monthlyUsage?.messages || 0).toLocaleString() },
            { color: "bg-purple-500", label: "Chats this month", count: (data?.monthlyUsage?.chats || 0).toLocaleString() },
            { color: "bg-amber-400", label: "Projects", count: (data?.usage?.projects || 0).toLocaleString() },
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
