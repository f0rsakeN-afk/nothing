"use client";

import * as React from "react";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  FolderOpen,
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

interface ProjectHistoryItemProps {
  item: HistoryItem;
  onRename: (project: { id: string; name: string }) => void;
  onDelete: (project: { id: string; name: string }) => void;
}

export function ProjectHistoryItem({
  item,
  onRename,
  onDelete,
}: ProjectHistoryItemProps) {
  return (
    <SidebarMenuItem className="group/menu-item">
      <SidebarMenuButton
        className="h-8 w-full text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 rounded-lg transition-colors"
      >
        <div className="flex min-w-0 items-center gap-2 pr-7 cursor-pointer w-full">
          <FolderOpen className="h-3.5 w-3.5 shrink-0 text-primary/60 group-hover/menu-item:text-primary transition-colors" />
          <span className="flex-1 truncate text-[12px] font-medium text-left">{item.title}</span>
        </div>
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
          className="w-40 bg-popover/95 backdrop-blur-sm border-border/50 shadow-xl rounded-xl"
        >
          <DropdownMenuGroup>
            <DropdownMenuItem
              className="gap-2.5 text-[12px] cursor-pointer rounded-lg"
              onClick={() => onRename({ id: item.id, name: item.title })}
            >
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              Rename
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              variant="destructive"
              className="gap-2.5 text-[12px] cursor-pointer rounded-lg"
              onClick={() => onDelete({ id: item.id, name: item.title })}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}
