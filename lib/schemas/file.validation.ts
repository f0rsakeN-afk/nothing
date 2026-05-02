/**
 * File Upload Validation Schemas
 * Zod schemas for file upload related validation
 */

import { z } from "zod";

// Dangerous file extensions that should never be allowed
const DANGEROUS_EXTENSIONS = [
  "exe", "bat", "cmd", "sh", "bash", "ps1", "vbs", "js", "jsp",
  "asp", "aspx", "php", "phtml", "cgi", "pl", "py", "rb",
  "html", "htm", "xml", "xsl", "svg", "hta", "dll", "so",
] as const;

// Supported content types with extension mapping
const ALLOWED_CONTENT_TYPES = [
  "text/plain",
  "text/markdown",
  "application/pdf",
  "application/json",
  "text/csv",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

export const fileTypeSchema = z.enum(ALLOWED_CONTENT_TYPES);
export type FileType = z.infer<typeof fileTypeSchema>;

// File size limits by content type (in bytes)
export const FILE_SIZE_LIMITS: Record<string, number> = {
  "text/plain": 10 * 1024 * 1024, // 10MB
  "text/markdown": 10 * 1024 * 1024, // 10MB
  "application/pdf": 50 * 1024 * 1024, // 50MB
  "application/json": 25 * 1024 * 1024, // 25MB
  "text/csv": 25 * 1024 * 1024, // 25MB
  "image/jpeg": 10 * 1024 * 1024, // 10MB
  "image/png": 10 * 1024 * 1024, // 10MB
  "image/gif": 10 * 1024 * 1024, // 10MB
  "image/webp": 10 * 1024 * 1024, // 10MB
};

// Maximum file size (100MB)
const MAX_FILE_SIZE = 100 * 1024 * 1024;

// Init upload body schema
export const initUploadSchema = z.object({
  fileName: z.string()
    .min(1, "Filename is required")
    .max(255, "Filename too long")
    .refine((name) => !name.includes(".."), "Invalid filename")
    .refine((name) => !name.includes("/"), "Invalid filename")
    .refine((name) => !name.includes("\\"), "Invalid filename")
    .refine((name) => !name.startsWith("."), "Hidden files not allowed")
    .refine((name) => {
      const ext = name.split(".").pop()?.toLowerCase();
      return !ext || !DANGEROUS_EXTENSIONS.includes(ext as typeof DANGEROUS_EXTENSIONS[number]);
    }, "File type not allowed"),
  fileType: fileTypeSchema,
  fileSize: z.number()
    .positive("File size must be positive")
    .max(MAX_FILE_SIZE, "File size exceeds maximum allowed"),
  projectId: z.string().uuid("Invalid project ID").nullish(),
});

// Presigned URL query schema
export const presignedUrlQuerySchema = z.object({
  uploadId: z.string().min(10).max(500),
  objectKey: z.string().min(1).max(1000),
  totalParts: z.coerce.number().int().min(1).max(10000).default(1),
});

// Complete upload body schema
export const completeUploadSchema = z.object({
  fileId: z.string().uuid("Invalid file ID"),
  uploadId: z.string().min(10).max(500),
  objectKey: z.string().min(1).max(1000),
  parts: z.array(z.object({
    partNumber: z.number().int().min(1).max(10000),
    etag: z.string().min(1),
  })).max(10000).optional(),
});

// Validate filename helper
export function validateFileName(fileName: string): { valid: boolean; error?: string } {
  if (!fileName || fileName.length === 0) {
    return { valid: false, error: "Filename cannot be empty" };
  }

  if (fileName.length > 255) {
    return { valid: false, error: "Filename too long (max 255 characters)" };
  }

  if (fileName.includes("..") || fileName.includes("/") || fileName.includes("\\")) {
    return { valid: false, error: "Invalid characters in filename" };
  }

  if (fileName.startsWith(".")) {
    return { valid: false, error: "Hidden files not allowed" };
  }

  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext && DANGEROUS_EXTENSIONS.includes(ext as typeof DANGEROUS_EXTENSIONS[number])) {
    return { valid: false, error: `File extension .${ext} not allowed` };
  }

  return { valid: true };
}

// Validate file size helper
export function validateFileSize(
  fileSize: number,
  contentType: string
): { valid: boolean; maxSizeMb?: number; error?: string } {
  const maxBytes = FILE_SIZE_LIMITS[contentType] || MAX_FILE_SIZE;

  if (fileSize <= 0) {
    return { valid: false, error: "File size must be greater than 0" };
  }

  if (fileSize > maxBytes) {
    return {
      valid: false,
      maxSizeMb: (FILE_SIZE_LIMITS[contentType] || MAX_FILE_SIZE) / (1024 * 1024),
      error: `File too large. Max ${(FILE_SIZE_LIMITS[contentType] || MAX_FILE_SIZE) / (1024 * 1024)}MB for ${contentType}`,
    };
  }

  return { valid: true };
}

// Validate content type helper
export function validateContentType(contentType: string): {
  valid: boolean;
  normalized?: string;
  error?: string
} {
  const normalized = contentType.toLowerCase().trim();

  if (!(normalized in FILE_SIZE_LIMITS)) {
    return { valid: false, error: `Unsupported content type: ${normalized}` };
  }

  return { valid: true, normalized };
}
