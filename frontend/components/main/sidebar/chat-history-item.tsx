"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Archive,
  Download,
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
import { cn } from "@/lib/utils";
import type { HistoryItem } from "./data";

// ─── Code-split dialogs ───────────────────────────────────────────────────────

const DeleteChatDialog = dynamic(
  () =>
    import("./dialogs/delete-chat-dialog").then((m) => ({
      default: m.DeleteChatDialog,
    })),
  { ssr: false },
);

const RenameChatDialog = dynamic(
  () =>
    import("./dialogs/rename-chat-dialog").then((m) => ({
      default: m.RenameChatDialog,
    })),
  { ssr: false },
);

const DownloadChatDialog = dynamic(
  () =>
    import("./dialogs/download-chat-dialog").then((m) => ({
      default: m.DownloadChatDialog,
    })),
  { ssr: false },
);

// ─── Component ────────────────────────────────────────────────────────────────

export function ChatHistoryItem({ item }: { item: HistoryItem }) {
  // open state
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [renameOpen, setRenameOpen] = React.useState(false);
  const [downloadOpen, setDownloadOpen] = React.useState(false);

  // once a dialog has been opened, keep it mounted so the close animation plays
  const [deleteEver, setDeleteEver] = React.useState(false);
  const [renameEver, setRenameEver] = React.useState(false);
  const [downloadEver, setDownloadEver] = React.useState(false);

  const openDelete = () => {
    setDeleteEver(true);
    setDeleteOpen(true);
  };
  const openRename = () => {
    setRenameEver(true);
    setRenameOpen(true);
  };
  const openDownload = () => {
    setDownloadEver(true);
    setDownloadOpen(true);
  };

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          className="h-8 w-full text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent/40  "
        >
          <Link
            href={`/chat/${item.id}`}
            className="flex min-w-0 items-center gap-2 pr-7"
          >
            <span className="flex-1 truncate text-[12.5px]">{item.title}</span>
          </Link>
        </SidebarMenuButton>

        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "absolute right-1 top-1/2 -translate-y-1/2",
              "flex h-5 w-5 items-center justify-center rounded-md outline-none",
              "text-sidebar-foreground/40 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              "opacity-0 transition-opacity duration-100",
              "group-hover/menu-item:opacity-100 data-[popup-open]:opacity-100 focus-visible:opacity-100",
            )}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </DropdownMenuTrigger>

          <DropdownMenuContent
            side="right"
            align="start"
            sideOffset={6}
            className="w-44"
          >
            <DropdownMenuGroup>
              <DropdownMenuItem className="gap-2.5 text-[13px] cursor-pointer">
                <Pin className="h-3.5 w-3.5 text-muted-foreground" />
                Pin
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2.5 text-[13px] cursor-pointer"
                onClick={openRename}
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
                onClick={openDownload}
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
                onClick={openDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>

      {/* Dialogs — mounted lazily, kept alive after first open for close animation */}
      {deleteEver && (
        <DeleteChatDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title={item.title}
        />
      )}
      {renameEver && (
        <RenameChatDialog
          open={renameOpen}
          onOpenChange={setRenameOpen}
          currentTitle={item.title}
          onRename={(newTitle) => console.log("rename →", newTitle)} // wire up later
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
