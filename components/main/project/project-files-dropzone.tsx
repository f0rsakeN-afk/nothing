"use client";

import { useState } from "react";
import { FileText, FileCode, File, Plus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useProjectFiles } from "@/hooks/use-files";
import type { ProjectFile } from "@/types/project";

interface ProjectFilesDropzoneProps {
  projectId: string;
}

export function ProjectFilesDropzone({ projectId }: ProjectFilesDropzoneProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data, isLoading } = useProjectFiles(projectId);
  const files = data?.files || [];

  const getFileIcon = (type: string) => {
    if (type.includes("pdf")) return <FileText className="w-5 h-5 text-red-500" />;
    if (type.includes("code") || type.includes("typescript") || type.includes("javascript"))
      return <FileCode className="w-5 h-5 text-blue-500" />;
    return <File className="w-5 h-5 text-muted-foreground" />;
  };

  return (
    <div className="flex-1 p-5 flex flex-col min-h-[300px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[15px] font-medium text-foreground">Files</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger className="p-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
            <Plus className="w-4 h-4 text-muted-foreground" />
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Files</DialogTitle>
            </DialogHeader>
            <div className="py-8">
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                <File className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">
                  Drag and drop files here, or click to browse
                </p>
                <p className="text-xs text-muted-foreground/60 mt-2">
                  Supports PDF, TXT, MD, and code files
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Files List */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : files.length === 0 ? (
        <div className="flex-1 mt-2 bg-muted/30 border border-border/60 rounded-xl flex flex-col items-center justify-center p-6 text-center shadow-inner cursor-pointer hover:bg-muted/60 transition-colors border-dashed">
          <div className="flex items-center justify-center mb-4 relative opacity-60">
            <FileText className="w-8 h-8 text-muted-foreground absolute -left-6 z-0 -rotate-12" />
            <FileCode className="w-8 h-8 text-muted-foreground absolute -right-6 z-0 rotate-12" />
            <File className="w-10 h-10 text-foreground z-10" />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-background rounded-full border border-border flex items-center justify-center z-20">
              <Plus className="w-3 h-3 text-foreground" />
            </div>
          </div>
          <p className="text-[13px] text-muted-foreground max-w-[200px] leading-relaxed">
            Add PDFs, documents, or other text to reference in this project.
          </p>
        </div>
      ) : (
        <div className="flex-1 mt-2 space-y-2 overflow-y-auto">
          {files.map((file: ProjectFile) => (
            <div
              key={file.id}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
            >
              {getFileIcon(file.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {file.status}
                </p>
              </div>
              <button className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 transition-all">
                <X className="w-4 h-4 text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
