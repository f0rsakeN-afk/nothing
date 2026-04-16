"use client";

import { memo } from "react";
import { ServerCard, ServerItem, DeleteDialog } from "./server-card";

interface ServerListProps {
  servers: ServerItem[];
  testingId: string | null;
  deletingId: string | null;
  togglingId: string | null;
  connectingId: string | null;
  confirmDeleteId: string | null;
  onToggle: (id: string, isEnabled: boolean) => void;
  onDelete: (id: string) => void;
  onTest: (id: string) => void;
  onOAuthStart: (id: string) => void;
  onOAuthDisconnect: (id: string) => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}

export const ServerList = memo(function ServerList({
  servers,
  testingId,
  deletingId,
  togglingId,
  connectingId,
  confirmDeleteId,
  onToggle,
  onDelete,
  onTest,
  onOAuthStart,
  onOAuthDisconnect,
  onConfirmDelete,
  onCancelDelete,
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
      <div className="grid gap-3">
        {servers.map((server) => (
          <ServerCard
            key={server.id}
            server={server}
            isTesting={testingId === server.id}
            isDeleting={deletingId === server.id}
            isToggling={togglingId === server.id}
            isConnecting={connectingId === server.id}
            onToggle={onToggle}
            onDelete={onDelete}
            onTest={onTest}
            onOAuthStart={onOAuthStart}
            onOAuthDisconnect={onOAuthDisconnect}
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