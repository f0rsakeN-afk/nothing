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
} from "lucide-react";
import { ServiceIcon } from "./service-icon";

export interface ServerItem {
  id: string;
  name: string;
  url: string;
  authType: "none" | "bearer" | "header" | "oauth";
  isEnabled: boolean;
  hasCredentials: boolean;
  isOAuthConnected: boolean;
  oauthConfigured: boolean;
  lastError: string | null;
}

interface ServerCardProps {
  server: ServerItem;
  isTesting: boolean;
  isDeleting: boolean;
  isToggling: boolean;
  isConnecting: boolean;
  onToggle: (id: string, isEnabled: boolean) => void;
  onDelete: (id: string) => void;
  onTest: (id: string) => void;
  onOAuthStart: (id: string) => void;
  onOAuthDisconnect: (id: string) => void;
}

export const ServerCard = memo(function ServerCard({
  server,
  isTesting,
  isDeleting,
  isToggling,
  isConnecting,
  onToggle,
  onDelete,
  onTest,
  onOAuthStart,
  onOAuthDisconnect,
}: ServerCardProps) {
  const canReconnectOAuth = server.authType === "oauth" && server.oauthConfigured;

  return (
    <Card className="bg-card/50 border border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-8 shrink-0">
              <ServiceIcon url={server.url} name={server.name} size={24} />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm font-medium truncate">
                {server.name}
              </CardTitle>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {server.url}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Switch
              checked={server.isEnabled}
              onCheckedChange={(checked) => onToggle(server.id, checked)}
              disabled={isToggling}
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
                {canReconnectOAuth && (
                  <>
                    {!server.isOAuthConnected ? (
                      <DropdownMenuItem onClick={() => onOAuthStart(server.id)} disabled={isConnecting}>
                        <LinkIcon className="size-4 mr-2" />
                        Reconnect OAuth
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => onOAuthDisconnect(server.id)}>
                        <Link2Off className="size-4 mr-2" />
                        Disconnect OAuth
                      </DropdownMenuItem>
                    )}
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