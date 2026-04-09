/**
 * Project Files React Query Hooks
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProjectFileContext } from "@/services/project-context.service";

export interface ProjectFile {
  id: string;
  name: string;
  type: string;
  status: "PENDING_UPLOAD" | "PROCESSING" | "READY" | "FAILED";
  url: string;
  contentPreview: string | null;
  tokenCount: number | null;
  createdAt: string;
}

interface UploadInitResponse {
  fileId: string;
  uploadId: string;
  objectKey: string;
  totalParts: number;
}

interface PresignedResponse {
  presignedParts: Array<{ partNumber: number; url: string }>;
}

interface FileListResponse {
  files: ProjectFile[];
}

/**
 * Get project files
 */
export function useProjectFiles(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-files", projectId],
    queryFn: async () => {
      if (!projectId) return { files: [] };
      const res = await fetch(`/api/projects/${projectId}/files`);
      if (!res.ok) throw new Error("Failed to fetch files");
      const data: FileListResponse = await res.json();
      return data;
    },
    enabled: !!projectId,
  });
}

/**
 * Initialize multipart upload
 */
export function useInitUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      fileName: string;
      fileType: string;
      fileSize: number;
      projectId?: string;
    }): Promise<UploadInitResponse> => {
      const res = await fetch("/api/files/upload/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to initialize upload");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-files"] });
    },
  });
}

/**
 * Get presigned URLs
 */
export function useGetPresignedUrls() {
  return useMutation({
    mutationFn: async (params: {
      uploadId: string;
      objectKey: string;
      totalParts: number;
    }): Promise<PresignedResponse> => {
      const { uploadId, objectKey, totalParts } = params;
      const res = await fetch(
        `/api/files/upload/presigned?uploadId=${uploadId}&objectKey=${encodeURIComponent(objectKey)}&totalParts=${totalParts}`
      );
      if (!res.ok) throw new Error("Failed to get presigned URLs");
      return res.json();
    },
  });
}

/**
 * Complete multipart upload
 */
export function useCompleteUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      fileId: string;
      uploadId: string;
      objectKey: string;
      parts: Array<{ partNumber: number; etag: string }>;
    }): Promise<{ file: ProjectFile }> => {
      const res = await fetch("/api/files/upload/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to complete upload");
      }
      return res.json();
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["project-files"] });
    },
  });
}

/**
 * Upload file to project with multipart upload flow
 * Returns upload progress
 */
export function useUploadFile(projectId: string | undefined) {
  const initUpload = useInitUpload();
  const getPresigned = useGetPresignedUrls();
  const completeUpload = useCompleteUpload();

  const uploadFile = async (file: File): Promise<ProjectFile> => {
    // 1. Initialize upload
    const init = await initUpload.mutateAsync({
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      projectId,
    });

    // 2. Get presigned URLs
    const { presignedParts } = await getPresigned.mutateAsync({
      uploadId: init.uploadId,
      objectKey: init.objectKey,
      totalParts: init.totalParts,
    });

    // 3. Upload parts to S3
    const uploadPromises = presignedParts.map(async (part) => {
      const start = (part.partNumber - 1) * 5 * 1024 * 1024; // 5MB chunks
      const end = Math.min(start + 5 * 1024 * 1024, file.size);
      const chunk = file.slice(start, end);

      const response = await fetch(part.url, {
        method: "PUT",
        body: chunk,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to upload part ${part.partNumber}`);
      }

      return {
        partNumber: part.partNumber,
        etag: response.headers.get("ETag") || "",
      };
    });

    const parts = await Promise.all(uploadPromises);

    // 4. Complete upload
    const result = await completeUpload.mutateAsync({
      fileId: init.fileId,
      uploadId: init.uploadId,
      objectKey: init.objectKey,
      parts,
    });

    return result.file;
  };

  return {
    uploadFile,
    isUploading: initUpload.isPending || getPresigned.isPending || completeUpload.isPending,
    error: initUpload.error || getPresigned.error || completeUpload.error,
  };
}
