/**
 * S3 Upload Service
 * Handles multipart uploads with presigned URLs
 * Client uploads directly to S3 - no server bottleneck
 */

import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// S3 configuration from environment
const S3_CONFIG = {
  region: process.env.AWS_REGION || "us-east-1",
  bucket: process.env.AWS_S3_BUCKET || "",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
};

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MIN_PART_SIZE = 5 * 1024 * 1024; // 5MB for multipart
const PRESIGNED_URL_EXPIRY = 15 * 60; // 15 minutes

// File type to extension mapping
const CONTENT_TYPE_MAP: Record<string, string> = {
  "text/plain": "txt",
  "text/markdown": "md",
  "application/pdf": "pdf",
  "application/json": "json",
  "text/csv": "csv",
};

export interface PresignedPart {
  partNumber: number;
  url: string;
}

export interface MultipartUploadResult {
  uploadId: string;
  objectKey: string;
  presignedParts: PresignedPart[];
}

export interface CompletedPart {
  partNumber: number;
  etag: string;
}

// Create S3 client
export function getS3Client(): S3Client {
  if (!S3_CONFIG.accessKeyId || !S3_CONFIG.secretAccessKey) {
    throw new Error("AWS credentials not configured");
  }
  return new S3Client({
    region: S3_CONFIG.region,
    credentials: {
      accessKeyId: S3_CONFIG.accessKeyId,
      secretAccessKey: S3_CONFIG.secretAccessKey,
    },
  });
}

/**
 * Generate object key for file
 */
export function generateObjectKey(
  userId: string,
  projectId: string | undefined,
  fileId: string,
  fileName: string
): string {
  const projectPrefix = projectId || "no-project";
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `uploads/${userId}/${projectPrefix}/${fileId}/${sanitizedName}`;
}

/**
 * Initialize multipart upload
 */
export async function createMultipartUploadInit(
  userId: string,
  projectId: string | undefined,
  fileId: string,
  fileName: string,
  contentType: string
): Promise<{ uploadId: string; objectKey: string }> {
  const client = getS3Client();
  const objectKey = generateObjectKey(userId, projectId, fileId, fileName);

  const command = new CreateMultipartUploadCommand({
    Bucket: S3_CONFIG.bucket,
    Key: objectKey,
    ContentType: contentType,
  });

  const response = await client.send(command);

  if (!response.UploadId) {
    throw new Error("Failed to create multipart upload");
  }

  return {
    uploadId: response.UploadId,
    objectKey,
  };
}

/**
 * Get presigned URLs for each part
 */
export async function getMultipartPresignedUrls(
  objectKey: string,
  uploadId: string,
  totalParts: number
): Promise<PresignedPart[]> {
  const client = getS3Client();
  const parts: PresignedPart[] = [];

  for (let i = 1; i <= totalParts; i++) {
    const command = new UploadPartCommand({
      Bucket: S3_CONFIG.bucket,
      Key: objectKey,
      UploadId: uploadId,
      PartNumber: i,
    });

    const url = await getSignedUrl(client, command, {
      expiresIn: PRESIGNED_URL_EXPIRY,
    });

    parts.push({ partNumber: i, url });
  }

  return parts;
}

/**
 * Complete multipart upload
 */
export async function completeMultipartUpload(
  objectKey: string,
  uploadId: string,
  parts: CompletedPart[]
): Promise<void> {
  const client = getS3Client();

  const command = new CompleteMultipartUploadCommand({
    Bucket: S3_CONFIG.bucket,
    Key: objectKey,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: parts.map((p) => ({
        PartNumber: p.partNumber,
        ETag: p.etag,
      })),
    },
  });

  await client.send(command);
}

/**
 * Abort multipart upload
 */
export async function abortMultipartUpload(
  objectKey: string,
  uploadId: string
): Promise<void> {
  const client = getS3Client();

  const command = new AbortMultipartUploadCommand({
    Bucket: S3_CONFIG.bucket,
    Key: objectKey,
    UploadId: uploadId,
  });

  await client.send(command);
}

/**
 * Get presigned download URL
 */
export async function getPresignedDownloadUrl(
  objectKey: string
): Promise<string> {
  const client = getS3Client();

  const command = new GetObjectCommand({
    Bucket: S3_CONFIG.bucket,
    Key: objectKey,
  });

  return getSignedUrl(client, command, {
    expiresIn: PRESIGNED_URL_EXPIRY,
  });
}

/**
 * Calculate number of parts needed
 */
export function calculateParts(fileSize: number): number {
  if (fileSize <= MIN_PART_SIZE) {
    return 1;
  }
  return Math.ceil(fileSize / MIN_PART_SIZE);
}

/**
 * Get file size limit for content type
 */
export function getFileSizeLimit(contentType: string): number {
  switch (contentType) {
    case "text/plain":
    case "text/markdown":
      return 10 * 1024 * 1024; // 10MB
    case "application/pdf":
      return 50 * 1024 * 1024; // 50MB
    case "application/json":
    case "text/csv":
      return 25 * 1024 * 1024; // 25MB
    default:
      return MAX_FILE_SIZE;
  }
}

/**
 * Check if content type is supported
 */
export function isContentTypeSupported(contentType: string): boolean {
  return contentType in CONTENT_TYPE_MAP;
}

/**
 * Get file extension for content type
 */
export function getExtension(contentType: string): string {
  return CONTENT_TYPE_MAP[contentType] || "bin";
}
