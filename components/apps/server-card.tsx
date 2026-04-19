"use client";

import { memo } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Loader2,
  MoreHorizontal,
  Trash2,
  Zap,
  Link2Off,
  LinkIcon,
  Wrench,
  ChevronDown,
} from "lucide-react";
import { ServiceIcon } from "./service-icon";
import { cn } from "@/lib/utils";

export interface ServerItem {
  id: string;
  name: string;
  url: string;
  authType: "none" | "bearer" | "header" | "oauth";
  isEnabled: boolean;
  hasCredentials: boolean;
  isOAuthConnected: boolean;
  oauthConfigured: boolean;
  oauthError: string | null;
  oauthConnectedAt: string | null;
  disabledTools: string[];
  lastTestedAt: string | null;
  lastError: string | null;
}

export interface ToolInfo {
  name: string;
  title: string | null;
  description: string | null;
}

interface ServerCardProps {
  server: ServerItem;
  isTesting: boolean;
  isDeleting: boolean;
  isToggling: boolean;
  isConnecting: boolean;
  isToolsExpanded: boolean;
  tools: ToolInfo[];
  isLoadingTools: boolean;
  disabledTools: string[];
  onToggle: (id: string, isEnabled: boolean) => void;
  onDelete: (id: string) => void;
  onTest: (id: string) => void;
  onOAuthStart: (id: string) => void;
  onOAuthDisconnect: (id: string) => void;
  onToolsToggle: (id: string) => void;
  onToolToggle: (serverId: string, disabledTools: string[], toolName: string) => void;
  onEnableAllTools: (serverId: string) => void;
}

export const ServerCard = memo(function ServerCard({
  server,
  isTesting,
  isDeleting,
  isToggling,
  isConnecting,
  isToolsExpanded,
  tools,
  isLoadingTools,
  disabledTools,
  onToggle,
  onDelete,
  onTest,
  onOAuthStart,
  onOAuthDisconnect,
  onToolsToggle,
  onToolToggle,
  onEnableAllTools,
}: ServerCardProps) {
  const canReconnectOAuth = server.authType === "oauth" && server.oauthConfigured;
  const isReady = server.authType !== "oauth" || server.isOAuthConnected;
  const disabledForServer = disabledTools;

  const handleToolToggle = (toolName: string) => {
    onToolToggle(server.id, disabledForServer, toolName);
  };

  return (
    <div className="transition-colors hover:bg-muted/20">
      <Card className="bg-card/50 border border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-8 shrink-0">
                <ServiceIcon url={server.url} name={server.name} size={24} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-medium truncate">
                    {server.name}
                  </CardTitle>
                  {server.authType === "oauth" && !server.isOAuthConnected && (
                    <span className="shrink-0 size-1.5 rounded-full bg-amber-400 dark:bg-amber-500" title="OAuth not connected" />
                  )}
                  {disabledForServer.length > 0 && (
                    <span className="shrink-0 text-xs font-medium text-muted-foreground/60 tabular-nums">
                      {disabledForServer.length} hidden
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {server.url}
                </p>
                {(server.oauthError || server.lastError) && (
                  <p className="text-xs text-destructive/80 truncate mt-1">
                    {server.oauthError || server.lastError}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {server.authType === "oauth" && !server.isOAuthConnected && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs px-2.5 gap-1"
                  onClick={() => onOAuthStart(server.id)}
                  disabled={isConnecting}
                >
                  {isConnecting ? <Loader2 className="size-3 animate-spin" /> : <LinkIcon className="size-3" />}
                  Connect
                </Button>
              )}
              <Switch
                checked={server.isEnabled}
                onCheckedChange={(checked) => onToggle(server.id, checked)}
                disabled={isToggling || (server.authType === "oauth" && !server.isOAuthConnected)}
              />
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    {isTesting || isDeleting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <MoreHorizontal className="size-4" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onTest(server.id)} disabled={isTesting}>
                    <Zap className="size-4 mr-2" />
                    Test connection
                  </DropdownMenuItem>
                  {canReconnectOAuth && server.isOAuthConnected && (
                    <>
                      <DropdownMenuItem onClick={() => onOAuthStart(server.id)}>
                        <LinkIcon className="size-4 mr-2" />
                        Reconnect OAuth
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onOAuthDisconnect(server.id)}>
                        <Link2Off className="size-4 mr-2" />
                        Disconnect OAuth
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(server.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="size-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {isReady && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-7 p-0 text-muted-foreground"
                  title="Manage tools"
                  onClick={() => onToolsToggle(server.id)}
                >
                  <ChevronDown className={cn("size-4 transition-transform duration-150", isToolsExpanded && "rotate-180")} />
                </Button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            {server.isEnabled ? (
              <Badge variant="default" className="text-xs">Enabled</Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">Disabled</Badge>
            )}
            {server.hasCredentials && (
              <Badge variant="outline" className="text-xs">Credentials</Badge>
            )}
            {server.lastError && (
              <Badge variant="destructive" className="text-xs" title={server.lastError}>
                Error
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Tools expansion panel */}
      {isToolsExpanded && isReady && (
        <div className="px-5 pb-4">
          <div className="rounded-lg border border-border/40 bg-muted/30 overflow-hidden">
            <div className="px-3 py-2 border-b border-border/30 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Wrench className="size-3 text-muted-foreground/60" />
                <span className="text-xs font-medium text-muted-foreground">Tools</span>
                {!isLoadingTools && tools.length > 0 && (
                  <span className="text-xs text-muted-foreground/50 tabular-nums">
                    {tools.length - disabledForServer.length}/{tools.length} enabled
                  </span>
                )}
              </div>
              {!isLoadingTools && tools.length > 0 && disabledForServer.length > 0 && (
                <button
                  type="button"
                  onClick={() => onEnableAllTools(server.id)}
                  className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  Enable all
                </button>
              )}
            </div>
            {isLoadingTools ? (
              <div className="px-3 py-3 flex items-center gap-2 text-xs text-muted-foreground/60">
                <Loader2 className="size-3.5 animate-spin shrink-0" />
                Loading tools…
              </div>
            ) : tools.length === 0 ? (
              <div className="px-3 py-3 text-xs text-muted-foreground/60">No tools found</div>
            ) : (
              <div className="max-h-[280px] overflow-y-auto divide-y divide-border/30">
                {tools.map((tool) => {
                  const isDisabled = disabledForServer.includes(tool.name);
                  return (
                    <div
                      key={tool.name}
                      onClick={() => handleToolToggle(tool.name)}
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/40 transition-colors group"
                    >
                      <div className={cn("size-1.5 rounded-full shrink-0 transition-colors", isDisabled ? "bg-muted-foreground/20" : "bg-emerald-500")} />
                      <span className={cn("flex-1 text-xs font-mono truncate transition-colors", isDisabled ? "text-muted-foreground/40 line-through" : "text-foreground/80")}>
                        {tool.title ?? tool.name}
                      </span>
                      <Switch
                        checked={!isDisabled}
                        onCheckedChange={() => handleToolToggle(tool.name)}
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0 scale-75"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

// Delete confirmation dialog
interface DeleteDialogProps {
  open: boolean;
  serverName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteDialog({ open, serverName, onConfirm, onCancel }: DeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete server</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;{serverName}&quot;? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}