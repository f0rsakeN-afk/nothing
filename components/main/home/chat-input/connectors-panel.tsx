"use client";

import * as React from "react";
import { useServers, useToggleServer } from "@/hooks/use-mcp-servers";
import { useUser } from "@stackframe/stack";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { ServiceIcon } from "@/components/apps/service-icon";
import { toast } from "@/components/ui/sonner";
import type { ServerItem } from "@/components/apps";
import { useHaptics } from "@/hooks/use-web-haptics";

interface ConnectorsPanelProps {
  onClose: () => void;
}

export function ConnectorsPanel({ onClose }: ConnectorsPanelProps) {
  const user = useUser();
  const { data: servers = [], isLoading } = useServers(user?.id);
  const toggleServer = useToggleServer();
  const { trigger } = useHaptics();

  const handleToggle = async (server: ServerItem, isEnabled: boolean) => {
    try {
      await toggleServer.mutateAsync({ id: server.id, isEnabled });
      trigger("success");
    } catch (error) {
      trigger("error");
      toast.error(
        error instanceof Error ? error.message : "Failed to toggle server"
      );
    }
  };

  const enabledCount = servers.filter((s) => s.isEnabled).length;

  return (
    <div className="flex flex-col w-52 max-h-72">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border/40">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-foreground">Connectors</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {enabledCount} of {servers.length} active
          </p>
        </div>
      </div>

      {/* Server list */}
      <div className="flex-1 overflow-y-auto py-1 px-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          </div>
        ) : servers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-5 px-3 text-center">
            <p className="text-[11px] text-muted-foreground">No connected apps</p>
            <a
              href="/apps?tab=my-servers"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 text-[10px] text-primary hover:underline"
            >
              Add apps in Settings
            </a>
          </div>
        ) : (
          <div className="space-y-0.5">
            {servers.map((server) => (
              <button
                key={server.id}
                onClick={() => handleToggle(server, !server.isEnabled)}
                disabled={toggleServer.isPending}
                className={cn(
                  "flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-left",
                  "hover:bg-muted/60 transition-all active:scale-[0.98]",
                  toggleServer.isPending && "opacity-50 pointer-events-none"
                )}
              >
                <div className="flex items-center justify-center w-5 h-5 shrink-0">
                  <ServiceIcon url={server.url} name={server.name} size={12} />
                </div>
                <span className="flex-1 text-[11px] font-medium text-foreground truncate">
                  {server.name}
                </span>
                {/* Toggle */}
                <div
                  className={cn(
                    "w-3 h-3 rounded-full border transition-all shrink-0",
                    server.isEnabled
                      ? "bg-primary border-primary"
                      : "border-muted-foreground/30"
                  )}
                >
                  {server.isEnabled && (
                    <svg viewBox="0 0 12 12" fill="none" className="w-full h-full">
                      <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-1 py-1 border-t border-border/40">
        <a
          href="/apps?tab=my-servers"
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClose}
          className="flex items-center justify-center gap-1 w-full px-2 py-1.5 rounded-md text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
        >
          <span>Manage connected apps</span>
          <svg viewBox="0 0 12 12" fill="none" className="w-2.5 h-2.5">
            <path d="M3 9l6-6M9 3H5m4 0v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      </div>
    </div>
  );
}
