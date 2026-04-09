"use client";

import * as React from "react";
import Link from "next/link";
import {
  Archive,
  Download,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Pin,
  Trash2,
} from "lucide-react";

import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogMedia, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useChatPrefetch } from "@/hooks/use-chat-prefetch";

interface HistoryItem {
  id: string;
  title: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ChatHistoryItemProps {
  item: HistoryItem;
  onDelete?: (id: string) => Promise<void>;
  onRename?: (id: string, title: string) => Promise<void>;
}

// =========================================
// Delete Dialog
// =========================================

function DeleteChatDialog({
  open,
  onOpenChange,
  title,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10">
            <Trash2 className="size-5 text-destructive" />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-medium text-foreground">&ldquo;{title}&rdquo;</span> will be permanently deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            render={<Button variant="destructive" />}
            onClick={onConfirm}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// =========================================
// Rename Dialog
// =========================================

function RenameChatDialog({
  open,
  onOpenChange,
  currentTitle,
  onRename,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTitle: string;
  onRename: (title: string) => void;
}) {
  const [value, setValue] = React.useState(currentTitle);

  React.useEffect(() => {
    if (open) setValue(currentTitle);
  }, [open, currentTitle]);

  const handleSave = () => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== currentTitle) onRename(trimmed);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Rename conversation</DialogTitle>
          <DialogDescription>Give this conversation a new name.</DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="rename-input" className="text-xs font-medium">Title</Label>
          <Input
            id="rename-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            autoFocus
            className="h-9 text-sm"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" size="lg" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="lg" disabled={!value.trim()} onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =========================================
// Download Dialog (placeholder)
// =========================================

function DownloadChatDialog({
  open,
  onOpenChange,
  title,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Download conversation</AlertDialogTitle>
          <AlertDialogDescription>
            Download functionality coming soon.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// =========================================
// Main Component
// =========================================

export function ChatHistoryItem({ item, onDelete, onRename }: ChatHistoryItemProps) {
  const { prefetchOnHover } = useChatPrefetch();
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [renameOpen, setRenameOpen] = React.useState(false);
  const [downloadOpen, setDownloadOpen] = React.useState(false);

  const [deleteEver, setDeleteEver] = React.useState(false);
  const [renameEver, setRenameEver] = React.useState(false);
  const [downloadEver, setDownloadEver] = React.useState(false);

  const handleDelete = () => {
    onDelete?.(item.id);
    setDeleteOpen(false);
  };

  const handleRename = (title: string) => {
    onRename?.(item.id, title);
  };

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          render={
            <Link href={`/chat/${item.id}`} className="flex min-w-0 items-center gap-2 pr-7" onMouseEnter={() => prefetchOnHover(item.id)}>
              <span className="flex-1 font-semibold tracking-wider truncate text-[12.5px]">
                {item.title}
              </span>
            </Link>
          }
          className="h-8 w-full text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent/40"
        />

        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "absolute right-1 top-1/2 -translate-y-1/2",
              "flex h-5 w-5 items-center justify-center rounded-md outline-none",
              "text-sidebar-foreground/40 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              "opacity-0 transition-opacity duration-100",
              "group-hover/menu-item:opacity-100 data-popup-open:opacity-100 focus-visible:opacity-100",
            )}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </DropdownMenuTrigger>

          <DropdownMenuContent side="right" align="start" sideOffset={6} className="w-44">
            <DropdownMenuGroup>
              <DropdownMenuItem className="gap-2.5 text-[13px] cursor-pointer">
                <Pin className="h-3.5 w-3.5 text-muted-foreground" />
                Pin
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2.5 text-[13px] cursor-pointer">
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                Open in new tab
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2.5 text-[13px] cursor-pointer"
                onClick={() => { setRenameEver(true); setRenameOpen(true); }}
              >
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2.5 text-[13px] cursor-pointer">
                <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                Archive
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2.5 text-[13px] cursor-pointer"
                onClick={() => { setDownloadEver(true); setDownloadOpen(true); }}
              >
                <Download className="h-3.5 w-3.5 text-muted-foreground" />
                Download
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                variant="destructive"
                className="gap-2.5 text-[13px] cursor-pointer"
                onClick={() => { setDeleteEver(true); setDeleteOpen(true); }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>

      {deleteEver && (
        <DeleteChatDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title={item.title}
          onConfirm={handleDelete}
        />
      )}
      {renameEver && (
        <RenameChatDialog
          open={renameOpen}
          onOpenChange={setRenameOpen}
          currentTitle={item.title}
          onRename={handleRename}
        />
      )}
      {downloadEver && (
        <DownloadChatDialog
          open={downloadOpen}
          onOpenChange={setDownloadOpen}
          title={item.title}
        />
      )}
    </>
  );
}
