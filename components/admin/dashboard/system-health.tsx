"use client";

import { cn } from "@/lib/utils";

interface SystemHealthProps {
  redis: "connected" | "disconnected";
  db: "connected" | "disconnected";
  apiLatencyMs: number | null;
  cachedAt?: string;
}

function StatusBadge({ status }: { status: "connected" | "disconnected" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md",
        status === "connected"
          ? "bg-green-500/10 text-green-600 dark:text-green-400"
          : "bg-destructive/10 text-destructive",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "connected" ? "bg-green-500" : "bg-destructive",
        )}
      />
      {status === "connected" ? "Healthy" : "Disconnected"}
    </span>
  );
}

export function SystemHealth({ redis, db, apiLatencyMs, cachedAt }: SystemHealthProps) {
  return (
    <div className="flex flex-col gap-4 p-5 rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">System Health</span>
        {cachedAt && (
          <span className="text-xs text-muted-foreground">
            Updated {new Date(cachedAt).toLocaleTimeString()}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Database */}
        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted-foreground">Database</span>
          <StatusBadge status={db} />
        </div>

        {/* Redis */}
        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted-foreground">Redis Cache</span>
          <StatusBadge status={redis} />
        </div>

        {/* API Latency */}
        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted-foreground">API Latency</span>
          {apiLatencyMs !== null ? (
            <span className="text-xs font-medium text-foreground">
              {apiLatencyMs}ms
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">N/A</span>
          )}
        </div>
      </div>
    </div>
  );
}