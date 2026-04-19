"use client";

import { memo } from "react";
import { ServerCard, ServerItem, DeleteDialog, ToolInfo } from "./server-card";

interface ServerListProps {
  servers: ServerItem[];
  testingId: string | null;
  deletingId: string | null;
  togglingId: string | null;
  connectingId: string | null;
  confirmDeleteId: string | null;
  expandedToolsId: string | null;
  serverToolsCache: Record<string, ToolInfo[]>;
  toolsLoading: Record<string, boolean>;
  onToggle: (id: string, isEnabled: boolean) => void;
  onDelete: (id: string) => void;
  onTest: (id: string) => void;
  onOAuthStart: (id: string) => void;
  onOAuthDisconnect: (id: string) => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onToolsToggle: (id: string) => void;
  onToolToggle: (serverId: string, currentDisabled: string[], toolName: string) => void;
  onEnableAllTools: (serverId: string) => void;
}

export const ServerList = memo(function ServerList({
  servers,
  testingId,
  deletingId,
  togglingId,
  connectingId,
  confirmDeleteId,
  expandedToolsId,
  serverToolsCache,
  toolsLoading,
  onToggle,
  onDelete,
  onTest,
  onOAuthStart,
  onOAuthDisconnect,
  onConfirmDelete,
  onCancelDelete,
  onToolsToggle,
  onToolToggle,
  onEnableAllTools,
}: ServerListProps) {
  const serverToDelete = servers.find((s) => s.id === confirmDeleteId);

  if (servers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No connected servers yet</p>
        <p className="text-sm text-muted-foreground/60 mt-1">
          Add apps from the Marketplace to get started
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-border/60 divide-y divide-border/40 bg-card/50 overflow-hidden">
        {[...servers].sort((a, b) => {
          const score = (s: ServerItem) => {
            const ready = s.authType !== "oauth" || s.isOAuthConnected;
            if (s.isEnabled && ready) return 3;
            if (s.isEnabled && !ready) return 2;
            if (!s.isEnabled && ready) return 1;
            return 0;
          };
          return score(b) - score(a);
        }).map((server) => (
          <ServerCard
            key={server.id}
            server={server}
            isTesting={testingId === server.id}
            isDeleting={deletingId === server.id}
            isToggling={togglingId === server.id}
            isConnecting={connectingId === server.id}
            isToolsExpanded={expandedToolsId === server.id}
            tools={serverToolsCache[server.id] ?? []}
            isLoadingTools={toolsLoading[server.id] ?? false}
            disabledTools={server.disabledTools ?? []}
            onToggle={onToggle}
            onDelete={onDelete}
            onTest={onTest}
            onOAuthStart={onOAuthStart}
            onOAuthDisconnect={onOAuthDisconnect}
            onToolsToggle={onToolsToggle}
            onToolToggle={onToolToggle}
            onEnableAllTools={onEnableAllTools}
          />
        ))}
      </div>
      {serverToDelete && (
        <DeleteDialog
          open={!!confirmDeleteId}
          serverName={serverToDelete.name}
          onConfirm={onConfirmDelete}
          onCancel={onCancelDelete}
        />
      )}
    </>
  );
});