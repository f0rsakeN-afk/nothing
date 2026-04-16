"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Globe, Link2, ChevronRight } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

type MenuPanel = "main" | "connectors";

export function ChatActionsMenu({
  onFileSelect,
  webSearchEnabled,
  onWebSearchToggle,
}: ChatActionsMenuProps) {
  const [open, setOpen] = React.useState(false);
  const [panel, setPanel] = React.useState<MenuPanel>("main");
  const user = useUser();
  const { data: servers = [] } = useServers(user?.id);

  const enabledServers = servers.filter((s) => s.isEnabled).slice(0, 4);
  const extraCount = Math.max(0, servers.filter((s) => s.isEnabled).length - 4);

  const handleOpenChange = React.useCallback((isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setTimeout(() => setPanel("main"), 150);
    }
  }, []);

  const handleFileClick = React.useCallback(() => {
    onFileSelect();
    setOpen(false);
  }, [onFileSelect]);

  const handleWebSearchToggle = React.useCallback(() => {
    onWebSearchToggle(!webSearchEnabled);
    setOpen(false);
  }, [onWebSearchToggle, webSearchEnabled]);

  const hasActive = webSearchEnabled || enabledServers.length > 0;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <motion.button
            layoutId="chat-actions-trigger"
            aria-label="Connectors"
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-150 active:scale-95",
              "text-muted-foreground/60 hover:text-foreground hover:bg-muted/70",
            )}
          >
            <Tooltip>
              <TooltipTrigger
                render={<div className="flex items-center justify-center"><Link2 className="h-[14px] w-[14px]" /></div>}
              />
              <TooltipContent side="bottom" sideOffset={8}>
                Connectors
              </TooltipContent>
            </Tooltip>
          </motion.button>
        }
      />
      <PopoverContent
        side="bottom"
        align="start"
        className={'w-max'}
        sideOffset={6}
      >
        <AnimatePresence mode="wait">
          {panel === "main" ? (
            <motion.div
              key="main"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="py-1"
            >
              {/* Connectors */}
              <button
                onClick={() => setPanel("connectors")}
                className="flex items-center gap-2.5 w-full px-2 py-1.5 text-[12px] text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-all active:scale-[0.98] rounded-md mx-0.5"
              >
                <Link2 className="h-[14px] w-[14px] shrink-0" />
                <span className="flex-1 text-left font-medium">Connectors</span>
                {enabledServers.length > 0 && (
                  <span className="text-[10px] font-medium bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                    {servers.filter((s) => s.isEnabled).length}
                  </span>
                )}
                <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
              </button>

              {/* Web search */}
              <button
                onClick={handleWebSearchToggle}
                className="flex items-center gap-2.5 w-full px-2 py-1.5 text-[12px] text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-all active:scale-[0.98] rounded-md mx-0.5"
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
            </motion.div>
          ) : (
            <motion.div
              key="connectors"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.12 }}
              className="flex"
            >
              <ConnectorsPanel onClose={() => setOpen(false)} />
            </motion.div>
          )}
        </AnimatePresence>
      </PopoverContent>
    </Popover>
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
