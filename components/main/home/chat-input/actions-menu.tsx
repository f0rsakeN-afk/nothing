"use client";

import * as React from "react";
import { Globe, Link2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ConnectorsPanel } from "./connectors-panel";
import { useServers } from "@/hooks/use-mcp-servers";
import { useUser } from "@stackframe/stack";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { ServerItem } from "@/components/apps";

interface ChatActionsMenuProps {
  onFileSelect: () => void;
  webSearchEnabled: boolean;
  onWebSearchToggle: (enabled: boolean) => void;
}

export function ChatActionsMenu({
  webSearchEnabled,
  onWebSearchToggle,
}: ChatActionsMenuProps) {
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const [connectorsDialogOpen, setConnectorsDialogOpen] = React.useState(false);
  const user = useUser();
  const { data: servers = [] } = useServers(user?.id);

  const enabledServers = servers.filter((s) => s.isEnabled).slice(0, 4);

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-150 active:scale-95",
            "text-muted-foreground/60 hover:text-foreground hover:bg-muted/70",
          )}
        >
          <Link2 className="h-[14px] w-[14px]" />
        </PopoverTrigger>
        <PopoverContent
          side="bottom"
          align="start"
          sideOffset={12}
          className="w-48 p-1.5"
        >
          {/* Connectors */}
          <button
            onClick={() => {
              setPopoverOpen(false);
              setTimeout(() => setConnectorsDialogOpen(true), 100);
            }}
            className="flex items-center gap-2.5 w-full px-2 py-1.5 text-[12px] text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-all active:scale-[0.98] rounded-md cursor-pointer"
          >
            <Link2 className="h-[14px] w-[14px] shrink-0" />
            <span className="flex-1 text-left font-medium">Connectors</span>
            {enabledServers.length > 0 && (
              <span className="text-[10px] font-medium bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                {servers.filter((s) => s.isEnabled).length}
              </span>
            )}
          </button>

          {/* Web search */}
          <button
            onClick={() => {
              onWebSearchToggle(!webSearchEnabled);
              setPopoverOpen(false);
            }}
            className="flex items-center gap-2.5 w-full px-2 py-1.5 text-[12px] text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-all active:scale-[0.98] rounded-md cursor-pointer"
          >
            <Globe
              className={cn(
                "h-[14px] w-[14px] shrink-0",
                webSearchEnabled && "text-blue-500",
              )}
            />
            <span className="flex-1 text-left font-medium">Web search</span>
            <div
              className={cn(
                "w-3.5 h-3.5 rounded-full border transition-all",
                webSearchEnabled
                  ? "bg-blue-500 border-blue-500"
                  : "border-muted-foreground/30",
              )}
            >
              {webSearchEnabled && (
                <svg
                  viewBox="0 0 12 12"
                  fill="none"
                  className="w-full h-full"
                >
                  <path
                    d="M2 6l3 3 5-5"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
          </button>
        </PopoverContent>
      </Popover>

      <Dialog open={connectorsDialogOpen} onOpenChange={setConnectorsDialogOpen}>
        <DialogContent className="p-0 gap-0 w-fit">
          <ConnectorsPanel onClose={() => setConnectorsDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

// Component to render in the bottom bar - shows active connectors as compact inline pills
export function ActiveConnectorsPill({
  servers,
  webSearchEnabled,
}: {
  servers: ServerItem[];
  webSearchEnabled: boolean;
}) {
  const enabledServers = servers.filter((s) => s.isEnabled).slice(0, 3);
  const extraCount = Math.max(0, servers.filter((s) => s.isEnabled).length - 3);

  if (enabledServers.length === 0 && !webSearchEnabled) return null;

  return (
    <div className="flex items-center -space-x-2">
      {webSearchEnabled && (
        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-50 dark:bg-blue-950/50 ring-2 ring-background z-10">
          <Globe className="h-3 w-3 text-blue-500" />
        </span>
      )}
      {enabledServers.map((server, i) => (
        <Avatar
          key={server.id}
          size="sm"
          className="ring-2 ring-background"
          style={{ zIndex: enabledServers.length - i }}
        >
          <AvatarImage src={getServiceFavicon(server.url)} alt={server.name} />
          <AvatarFallback className="text-[8px]">
            {server.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ))}
      {extraCount > 0 && (
        <div className="flex items-center justify-center h-6 w-6 rounded-full bg-muted text-[9px] font-medium text-muted-foreground ring-2 ring-background">
          +{extraCount}
        </div>
      )}
    </div>
  );
}

function getServiceFavicon(url: string): string {
  try {
    const urlObj = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
  } catch {
    return "";
  }
}
