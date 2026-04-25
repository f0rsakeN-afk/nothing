"use client";

import { useState, useCallback, useRef } from "react";
import { FileText, FileCode, File, Plus, X, Loader2, AlertTriangle, Upload, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@stackframe/stack-ui";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useProjectFiles, useDeleteProjectFile, useInitUpload, useGetPresignedUrls, useCompleteUpload } from "@/hooks/use-files";
import { toast } from "@/components/ui/sileo-toast";
import type { ProjectFile } from "@/types/project";

interface ProjectFilesDropzoneProps {
  projectId: string;
}

interface UploadingFile {
  id: string;
  name: string;
  progress: number;
  status: "uploading" | "processing" | "done" | "error";
  error?: string;
}

export function ProjectFilesDropzone({ projectId }: ProjectFilesDropzoneProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<ProjectFile | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const { data, isLoading } = useProjectFiles(projectId);
  const { mutate: deleteFile, isPending: isDeleting } = useDeleteProjectFile(projectId);
  const initUpload = useInitUpload(projectId);
  const getPresigned = useGetPresignedUrls();
  const completeUpload = useCompleteUpload(projectId);
  const files = data?.files || [];

  const getFileIcon = (type: string) => {
    if (type.includes("pdf")) return <FileText className="w-5 h-5 text-red-500" />;
    if (type.includes("code") || type.includes("typescript") || type.includes("javascript"))
      return <FileCode className="w-5 h-5 text-blue-500" />;
    return <File className="w-5 h-5 text-muted-foreground" />;
  };

  const handleDeleteFile = useCallback(() => {
    if (!fileToDelete) return;
    deleteFile(fileToDelete.id, {
      onSuccess: () => {
        setFileToDelete(null);
      },
    });
  }, [fileToDelete, deleteFile]);

  const cancelDeleteFile = useCallback(() => {
    setFileToDelete(null);
  }, []);

  const uploadFileWithProgress = useCallback(
    async (
      file: File,
      onProgress: (progress: number) => void
    ): Promise<void> => {
      // 1. Initialize upload
      onProgress(5);
      const init = await initUpload.mutateAsync({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        projectId,
      });

      // 2. Get presigned URLs
      onProgress(10);
      const { presignedParts } = await getPresigned.mutateAsync({
        uploadId: init.uploadId,
        objectKey: init.objectKey,
        totalParts: init.totalParts,
      });

      // 3. Upload parts to S3 with real progress tracking
      const partResults: Array<{ partNumber: number; etag: string }> = [];
      const totalParts = presignedParts.length;

      for (let i = 0; i < presignedParts.length; i++) {
        const part = presignedParts[i];
        const start = (part.partNumber - 1) * 5 * 1024 * 1024; // 5MB chunks
        const end = Math.min(start + 5 * 1024 * 1024, file.size);
        const chunk = file.slice(start, end);

        // Use XMLHttpRequest for progress tracking
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          xhr.upload.addEventListener("progress", (event) => {
            if (event.lengthComputable) {
              // Calculate progress for this part (0 to 1)
              const partProgress = event.loaded / event.total;
              // Calculate overall progress (10% to 80% is for uploading)
              const uploadProgress = 10 + (partProgress * 70) / totalParts + (i * 70) / totalParts;
              onProgress(Math.round(uploadProgress));
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              partResults.push({
                partNumber: part.partNumber,
                etag: xhr.getResponseHeader("ETag") || "",
              });
              resolve();
            } else {
              reject(new Error(`Failed to upload part ${part.partNumber}`));
            }
          });

          xhr.addEventListener("error", () => {
            reject(new Error(`Failed to upload part ${part.partNumber}`));
          });

          xhr.open("PUT", part.url);
          xhr.send(chunk);
        });
      }

      // 4. Complete upload
      onProgress(85);
      await completeUpload.mutateAsync({
        fileId: init.fileId,
        uploadId: init.uploadId,
        objectKey: init.objectKey,
        parts: partResults,
      });
      onProgress(100);
    },
    [initUpload, getPresigned, completeUpload, projectId]
  );

  const handleFiles = useCallback(
    async (fileList: FileList) => {
      const newFiles = Array.from(fileList);
      if (newFiles.length === 0) return;

      // Validate file types
      const allowedTypes = [
        "application/pdf",
        "text/plain",
        "text/markdown",
        "text/csv",
        "application/json",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
      ];

      for (const file of newFiles) {
        if (!allowedTypes.includes(file.type)) {
          toast.error("Unsupported file type", {
            description: `${file.name} is not a supported file type.`,
          });
          return;
        }
      }

      // Start uploading each file
      for (const file of newFiles) {
        const uploadingId = Math.random().toString(36).substring(7);
        setUploadingFiles((prev) => [
          ...prev,
          { id: uploadingId, name: file.name, progress: 0, status: "uploading" },
        ]);

        try {
          await uploadFileWithProgress(file, (progress) => {
            setUploadingFiles((prev) =>
              prev.map((f) =>
                f.id === uploadingId ? { ...f, progress, status: "uploading" } : f
              )
            );
          });

          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.id === uploadingId ? { ...f, progress: 100, status: "done" } : f
            )
          );

          // Remove from uploading list after a short delay
          setTimeout(() => {
            setUploadingFiles((prev) => prev.filter((f) => f.id !== uploadingId));
          }, 2000);

          toast.success("File uploaded", {
            description: `${file.name} has been added to the project.`,
          });
        } catch (error) {
          const err = error as { message?: string };
          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.id === uploadingId
                ? { ...f, status: "error", error: err.message || "Upload failed" }
                : f
            )
          );

          toast.error("Upload failed", {
            description: err.message || `Failed to upload ${file.name}`,
          });
        }
      }
    },
    [uploadFileWithProgress]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFiles(files);
      }
    },
    [handleFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFiles(files);
      }
      // Reset input
      e.target.value = "";
    },
    [handleFiles]
  );

  const triggerFileUpload = useCallback(() => {
    document.getElementById("file-upload-input")?.click();
  }, []);

  const openUploadDialog = useCallback(() => {
    setDialogOpen(true);
  }, []);

  return (
    <>
      <div className="flex-1 p-5 flex flex-col min-h-[300px]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-medium text-foreground">Files</h3>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger className="p-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
              <Plus className="w-4 h-4 text-muted-foreground" />
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Upload Files</DialogTitle>
                <DialogDescription>
                  Drag and drop files or click to browse. Supported: PDF, TXT, MD, CSV, JSON, DOCX, XLSX
                </DialogDescription>
              </DialogHeader>
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={triggerFileUpload}
              >
                <input
                  id="file-upload-input"
                  type="file"
                  multiple
                  accept=".pdf,.txt,.md,.csv,.json,.docx,.doc,.xlsx,.xls"
                  className="hidden"
                  onChange={handleFileInput}
                />
                <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">
                  Drag and drop files here, or click to browse
                </p>
                <p className="text-xs text-muted-foreground/60 mt-2">
                  Max file size: 100MB
                </p>
              </div>

              {/* Upload Progress */}
              {uploadingFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  {uploadingFiles.map((f) => (
                    <div key={f.id} className="flex items-center gap-3">
                      {f.status === "done" && (
                        <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                      )}
                      {f.status === "error" && (
                        <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                      )}
                      {f.status === "uploading" && (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{f.name}</p>
                        {f.status === "uploading" && (
                          <Progress value={f.progress} className="h-1 mt-1" />
                        )}
                        {f.status === "error" && (
                          <p className="text-xs text-red-500">{f.error}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Upload Progress Outside Dialog */}
        {uploadingFiles.filter((f) => f.status !== "done").length > 0 && (
          <div className="mb-4 space-y-2">
            {uploadingFiles
              .filter((f) => f.status !== "done")
              .map((f) => (
                <div key={f.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{f.name}</p>
                    <Progress value={f.progress} className="h-1 mt-1" />
                  </div>
                </div>
              ))}
          </div>
        )}

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : files.length === 0 && uploadingFiles.length === 0 ? (
          <div
            className="flex-1 mt-2 bg-muted/30 border border-border/60 rounded-xl flex flex-col items-center justify-center p-6 text-center shadow-inner cursor-pointer hover:bg-muted/60 transition-colors border-dashed"
            onClick={openUploadDialog}
          >
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
                    {file.status.toLowerCase().replace("_", " ")}
                  </p>
                </div>
                <button
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFileToDelete(file);
                  }}
                >
                  <X className="w-4 h-4 text-destructive" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {fileToDelete && (
        <Dialog open={!!fileToDelete} onOpenChange={cancelDeleteFile}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Remove File
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to remove &ldquo;{fileToDelete.name}&rdquo; from this project?
                The file will be unlinked but not deleted. You can still access it from your Files page.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={cancelDeleteFile}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteFile} disabled={isDeleting}>
                {isDeleting ? "Removing..." : "Remove"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}