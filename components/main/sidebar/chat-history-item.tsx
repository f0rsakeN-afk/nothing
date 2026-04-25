"use client";

import * as React from "react";
import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  Download,
  ExternalLink,
  GitBranch,
  Globe,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Trash2,
  FolderOpen,
  FolderPlus,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogMedia, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useChatPrefetch } from "@/hooks/use-chat-prefetch";
import { useProjects } from "@/hooks/use-projects";
import { updateChat } from "@/services/chat.service";
import { ShareDialog } from "@/components/main/share/share-dialog";
import type { Project } from "@/types/project";

interface HistoryItem {
  id: string;
  title: string;
  createdAt?: string;
  updatedAt?: string;
  parentChatId?: string | null;
  visibility?: "public" | "private";
  archivedAt?: string | null;
  pinnedAt?: string | null;
  projectId?: string | null;
}

interface ChatHistoryItemProps {
  item: HistoryItem;
  onDelete?: (id: string) => Promise<void>;
  onRename?: (id: string, title: string) => Promise<void>;
  onArchive?: (id: string) => Promise<void>;
  onUnarchive?: (id: string) => Promise<void>;
  onShare?: (id: string, visibility: "public" | "private") => Promise<void>;
  onPin?: (id: string) => Promise<void>;
  onUnpin?: (id: string) => Promise<void>;
  isArchived?: boolean;
}

// =========================================
// Delete Dialog
// =========================================

function DeleteChatDialog({
  open,
  onOpenChange,
  title,
  onConfirm,
  t,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onConfirm: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10">
            <Trash2 className="size-5 text-destructive" />
          </AlertDialogMedia>
          <AlertDialogTitle>{t("chat.deleteChat")}</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-medium text-foreground">&ldquo;{title}&rdquo;</span> {t("chat.deleteChatConfirm")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            render={<Button variant="destructive" />}
            onClick={onConfirm}
          >
            {t("common.delete")}
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
  t,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTitle: string;
  onRename: (title: string) => void;
  t: ReturnType<typeof useTranslations>;
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
          <DialogTitle>{t("chatExtended.renameConversation")}</DialogTitle>
          <DialogDescription>{t("chatExtended.renameConversationDesc")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="rename-input" className="text-xs font-medium">{t("settings.displayName")}</Label>
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
            {t("common.cancel")}
          </Button>
          <Button size="lg" disabled={!value.trim()} onClick={handleSave}>
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =========================================
// Project Selection Dialog
// =========================================

function ProjectSelectDialog({
  open,
  onOpenChange,
  chatId,
  currentProjectId,
  t,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatId: string;
  currentProjectId: string | null | undefined;
  t: ReturnType<typeof useTranslations>;
}) {
  const { data: projectsData, isLoading } = useProjects();
  const projects = projectsData?.projects || [];
  const [isUpdating, setIsUpdating] = React.useState(false);

  const handleSelect = async (project: Project | null) => {
    setIsUpdating(true);
    try {
      await updateChat(chatId, { projectId: project?.id || null });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update chat project:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[320px]">
        <DialogHeader>
          <DialogTitle>{t("chatExtended.moveToProject")}</DialogTitle>
        </DialogHeader>
        <div className="pt-2 space-y-1 max-h-[300px] overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="py-6 text-center">
              <FolderOpen className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{t("sidebar.noProjectsYet")}</p>
              <Link
                href="/project"
                className="text-xs text-primary hover:underline mt-1 inline-block"
                onClick={() => onOpenChange(false)}
              >
                {t("sidebar.createProject")}
              </Link>
            </div>
          ) : (
            <>
              <button
                onClick={() => handleSelect(null)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left",
                  !currentProjectId
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted/60 text-muted-foreground"
                )}
                disabled={isUpdating}
              >
                <FolderOpen className="h-4 w-4" />
                <span className="text-sm">{t("chatExtended.noProject")}</span>
              </button>
              <div className="h-px bg-border/60 my-1" />
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleSelect(project)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left",
                    currentProjectId === project.id
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted/60"
                  )}
                  disabled={isUpdating}
                >
                  <FolderOpen className="h-4 w-4 text-primary/60" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{project.name}</p>
                    {project.description && (
                      <p className="text-xs text-muted-foreground truncate">
                        {project.description}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =========================================
// Download Dialog
// =========================================

type ExportFormat = 'pdf' | 'docx' | 'md' | 'txt';

function DownloadChatDialog({
  open,
  onOpenChange,
  chatId,
  title,
  t,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatId: string;
  title: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const [selectedFormat, setSelectedFormat] = React.useState<ExportFormat | null>(null);
  const [isExporting, setIsExporting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleExport = async (format: ExportFormat) => {
    setSelectedFormat(format);
    setIsExporting(true);
    setError(null);

    try {
      const ext = format === 'docx' ? 'docx' : format;
      const filename = `${title.replace(/[^a-zA-Z0-9\-_\s]/g, '')}.${ext}`;
      const url = `/api/export/chat/${chatId}/${format}`;

      const res = await fetch(url);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 413) {
          throw new Error(t("download.chatTooLarge"));
        }
        throw new Error(data.error || 'Export failed');
      }

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);

      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
      setSelectedFormat(null);
    }
  };

  const formats: ExportFormat[] = ['pdf', 'docx', 'md', 'txt'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle>{t("download.title")}</DialogTitle>
          <DialogDescription>
            {t("common.confirm")} <span className="font-medium text-foreground">&ldquo;{title}&rdquo;</span>
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-2">
          {formats.map((fmt) => (
            <button
              key={fmt}
              onClick={() => handleExport(fmt)}
              disabled={isExporting}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-3 rounded-lg border transition-colors text-left',
                'hover:bg-muted/60',
                selectedFormat === fmt ? 'border-primary bg-primary/5' : 'border-border',
                isExporting && selectedFormat !== fmt && 'opacity-50'
              )}
            >
              <div className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted',
                selectedFormat === fmt && 'bg-primary/15'
              )}>
                {isExporting && selectedFormat === fmt ? (
                  <div className="h-4 w-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                ) : (
                  <Download className={cn('h-4 w-4', selectedFormat === fmt && 'text-primary')} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{t(`download.format${fmt.charAt(0).toUpperCase() + fmt.slice(1)}` as any)}</p>
                <p className="text-xs text-muted-foreground">{t(`download.${fmt}Desc` as any)}</p>
              </div>
            </button>
          ))}
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" size="lg" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =========================================
// Main Component
// =========================================

export function ChatHistoryItem({
  item,
  onDelete,
  onRename,
  onArchive,
  onUnarchive,
  onShare,
  onPin,
  onUnpin,
  isArchived = false,
}: ChatHistoryItemProps) {
  const t = useTranslations();
  const { prefetchOnHover } = useChatPrefetch();
  const { closeMobileSidebar } = useSidebar();
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [renameOpen, setRenameOpen] = React.useState(false);
  const [downloadOpen, setDownloadOpen] = React.useState(false);
  const [shareOpen, setShareOpen] = React.useState(false);
  const [projectOpen, setProjectOpen] = React.useState(false);

  const [deleteEver, setDeleteEver] = React.useState(false);
  const [renameEver, setRenameEver] = React.useState(false);
  const [downloadEver, setDownloadEver] = React.useState(false);
  const [shareEver, setShareEver] = React.useState(false);

  const handleDelete = () => {
    onDelete?.(item.id);
    setDeleteOpen(false);
  };

  const handleRename = (title: string) => {
    onRename?.(item.id, title);
  };

  const handleArchive = () => {
    onArchive?.(item.id);
  };

  const handleUnarchive = () => {
    onUnarchive?.(item.id);
  };

  const handleShare = (visibility: "public" | "private") => {
    onShare?.(item.id, visibility);
  };

  const handlePin = () => {
    onPin?.(item.id);
  };

  const handleUnpin = () => {
    onUnpin?.(item.id);
  };

  const isPublic = item.visibility === "public";
  const isPinned = !!item.pinnedAt;

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          render={
            <Link href={`/chat/${item.id}`} onClick={closeMobileSidebar} className="flex min-w-0 items-center gap-2 pr-7" onMouseEnter={() => prefetchOnHover(item.id)}>
              <span className="flex-1 font-semibold tracking-wider truncate text-[12.5px]">
                {item.parentChatId && (
                  <GitBranch className="inline-block h-3 w-3 mr-1.5 text-sidebar-foreground/40 align-text-bottom" />
                )}
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
              {/* Pin/Unpin */}
              {isPinned ? (
                <DropdownMenuItem className="gap-2.5 text-[13px] cursor-pointer" onClick={handleUnpin}>
                  <PinOff className="h-3.5 w-3.5 text-muted-foreground" />
                  {t("chat.unpinChat")}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem className="gap-2.5 text-[13px] cursor-pointer" onClick={handlePin}>
                  <Pin className="h-3.5 w-3.5 text-muted-foreground" />
                  {t("chat.pinChat")}
                </DropdownMenuItem>
              )}

              {/* External Link */}
              <DropdownMenuItem
                className="gap-2.5 text-[13px] cursor-pointer"
                onClick={() => window.open(`/chat/${item.id}`, "_blank")}
              >
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                {t("chatExtended.openInNewTab")}
              </DropdownMenuItem>

              {/* Rename */}
              <DropdownMenuItem
                className="gap-2.5 text-[13px] cursor-pointer"
                onClick={() => { setRenameEver(true); setRenameOpen(true); }}
              >
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                {t("common.edit")}
              </DropdownMenuItem>

              {/* Add to Project */}
              <DropdownMenuItem
                className="gap-2.5 text-[13px] cursor-pointer"
                onClick={() => setProjectOpen(true)}
              >
                <FolderPlus className="h-3.5 w-3.5 text-muted-foreground" />
                {t("chatExtended.moveToProject")}
              </DropdownMenuItem>

              {/* Share */}
              <DropdownMenuItem
                className="gap-2.5 text-[13px] cursor-pointer"
                onClick={() => { setShareEver(true); setShareOpen(true); }}
              >
                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                {t("common.share")}
              </DropdownMenuItem>

              {/* Archive/Unarchive */}
              {isArchived ? (
                <DropdownMenuItem className="gap-2.5 text-[13px] cursor-pointer" onClick={handleUnarchive}>
                  <ArchiveRestore className="h-3.5 w-3.5 text-muted-foreground" />
                  {t("chat.unarchiveChat")}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem className="gap-2.5 text-[13px] cursor-pointer" onClick={handleArchive}>
                  <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                  {t("chat.archiveChat")}
                </DropdownMenuItem>
              )}

              {/* Download - placeholder */}
              <DropdownMenuItem
                className="gap-2.5 text-[13px] cursor-pointer"
                onClick={() => { setDownloadEver(true); setDownloadOpen(true); }}
              >
                <Download className="h-3.5 w-3.5 text-muted-foreground" />
                {t("common.download")}
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
                {t("common.delete")}
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
          t={t}
        />
      )}
      {renameEver && (
        <RenameChatDialog
          open={renameOpen}
          onOpenChange={setRenameOpen}
          currentTitle={item.title}
          onRename={handleRename}
          t={t}
        />
      )}
      {downloadEver && (
        <DownloadChatDialog
          open={downloadOpen}
          onOpenChange={setDownloadOpen}
          chatId={item.id}
          title={item.title}
          t={t}
        />
      )}
      {shareEver && (
        <ShareDialog
          isOpen={shareOpen}
          onOpenChange={setShareOpen}
          chatId={item.id}
          selectedVisibilityType={item.visibility || "private"}
          onShare={async (chatId, visibility) => {
            item.visibility = visibility;
          }}
          isOwner={true}
        />
      )}
      <ProjectSelectDialog
        open={projectOpen}
        onOpenChange={setProjectOpen}
        chatId={item.id}
        currentProjectId={item.projectId}
        t={t}
      />
    </>
  );
}