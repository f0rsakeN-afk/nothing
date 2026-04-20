"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  FileCode,
  File,
  Loader2,
  AlertTriangle,
  Trash2,
  ExternalLink,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useDeleteFile } from "@/hooks/use-files";

interface FileItem {
  id: string;
  name: string;
  type: string;
  url: string;
  status: "PENDING_UPLOAD" | "PROCESSING" | "READY" | "FAILED";
  extractedContent: string | null;
  contentPreview: string | null;
  tokenCount: number | null;
  createdAt: string;
  projectId: string | null;
  project: { id: string; name: string } | null;
  chatIds: string[];
  contextCount: number;
}

interface FilesResponse {
  files: FileItem[];
  nextCursor: string | null;
  totalCount: number;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateString));
}

function getFileIcon(type: string) {
  if (type.includes("pdf")) return <FileText className="w-5 h-5 text-red-500" />;
  if (type.includes("code") || type.includes("typescript") || type.includes("javascript"))
    return <FileCode className="w-5 h-5 text-blue-500" />;
  return <File className="w-5 h-5 text-muted-foreground" />;
}

function FileCard({
  file,
  onDelete,
}: {
  file: FileItem;
  onDelete: (file: FileItem) => void;
}) {
  return (
    <Card className="group relative">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex items-center justify-center w-10 h-10 bg-muted rounded-lg shrink-0">
              {getFileIcon(file.type)}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium truncate">{file.name}</h3>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <span>{formatDate(file.createdAt)}</span>
                {file.project && (
                  <>
                    <span>•</span>
                    <span className="truncate max-w-[120px]">Project: {file.project.name}</span>
                  </>
                )}
                <span>•</span>
                <span>{file.contextCount} context{file.contextCount !== 1 ? "s" : ""}</span>
              </div>
              {file.contentPreview && (
                <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-2">
                  {file.contentPreview}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:text-destructive"
              onClick={() => onDelete(file)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DeleteConfirmDialog({
  file,
  onConfirm,
  isDeleting,
}: {
  file: FileItem | null;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  if (!file) return null;

  const contextWarning = file.project
    ? `This file is used in project "${file.project.name}". Removing it will clear its context from the project.`
    : null;

  return (
    <Dialog open={!!file} onOpenChange={() => {}}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Delete File
          </DialogTitle>
          <DialogDescription className="space-y-2">
            <p>
              Are you sure you want to delete &ldquo;{file.name}&rdquo;? This action cannot be undone.
            </p>
            {contextWarning && (
              <p className="text-amber-600 dark:text-amber-400 text-sm font-medium">
                Warning: {contextWarning}
              </p>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => {}}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FilesHeader({
  totalCount,
  fileUsage,
  fileLimit,
  searchQuery,
  onSearchChange,
}: {
  totalCount: number;
  fileUsage: number;
  fileLimit: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}) {
  const usagePercent = fileLimit > 0 ? Math.round((fileUsage / fileLimit) * 100) : 0;

  return (
    <div className="py-4 max-w-6xl mx-auto w-full px-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-medium">Files</h1>
          <p className="text-sm text-muted-foreground">
            {totalCount} file{totalCount !== 1 ? "s" : ""} total
          </p>
        </div>
        {fileLimit > 0 && (
          <div className="text-right">
            <p className="text-sm font-medium">
              {fileUsage} / {fileLimit === -1 ? "∞" : fileLimit} files
            </p>
            <p className="text-xs text-muted-foreground">
              {usagePercent}% used
            </p>
          </div>
        )}
      </div>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function FilesGrid({
  files,
  onDelete,
}: {
  files: FileItem[];
  onDelete: (file: FileItem) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto px-4">
      <div className="max-w-6xl mx-auto pb-8">
        {files.length === 0 ? (
          <div className="text-center py-12">
            <File className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No files found</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pt-2">
            {files.map((file) => (
              <FileCard key={file.id} file={file} onDelete={onDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function FilesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [fileToDelete, setFileToDelete] = useState<FileItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const deleteFile = useDeleteFile();

  const { data, isLoading } = useQuery<FilesResponse>({
    queryKey: ["files"],
    queryFn: async () => {
      const res = await fetch("/api/files");
      if (!res.ok) throw new Error("Failed to fetch files");
      return res.json();
    },
  });

  // Fetch account info for limits
  const { data: accountData } = useQuery({
    queryKey: ["account"],
    queryFn: async () => {
      const res = await fetch("/api/account");
      if (!res.ok) throw new Error("Failed to fetch account");
      return res.json();
    },
  });

  const files = data?.files || [];
  const totalCount = data?.totalCount || 0;
  const fileLimit = accountData?.plan?.limitsDetail?.maxAttachmentsPerChat || 0;
  const fileUsage = accountData?.usage?.files || 0;

  // Filter files based on search query (client-side for now)
  const filteredFiles = searchQuery
    ? files.filter((f) =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : files;

  const handleDeleteClick = (file: FileItem) => {
    setFileToDelete(file);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!fileToDelete) return;

    deleteFile.mutate(fileToDelete.id, {
      onSuccess: (result) => {
        if (result.warning) {
          console.warn(result.warning);
        }
        setFileToDelete(null);
        setDeleteDialogOpen(false);
      },
      onError: (error) => {
        console.error("Failed to delete file:", error);
        setFileToDelete(null);
        setDeleteDialogOpen(false);
      },
    });
  };

  const handleDeleteCancel = () => {
    setFileToDelete(null);
    setDeleteDialogOpen(false);
  };

  return (
    <div className="flex flex-col h-full">
      <FilesHeader
        totalCount={totalCount}
        fileUsage={fileUsage}
        fileLimit={fileLimit}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <FilesGrid files={filteredFiles} onDelete={handleDeleteClick} />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete File
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <p>
                Are you sure you want to delete &ldquo;{fileToDelete?.name}&rdquo;? This action
                cannot be undone.
              </p>
              {fileToDelete?.project && (
                <p className="text-amber-600 dark:text-amber-400 text-sm font-medium">
                  Warning: This file is used in project &ldquo;{fileToDelete.project.name}&rdquo;.
                  Removing it will clear its context from the project.
                </p>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleDeleteCancel}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteFile.isPending}
            >
              {deleteFile.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}