/**
 * Client-side Image Compression
 * Uses Canvas API for fast, no-upload compression
 *
 * For larger images or when Canvas API isn't available,
 * falls back to server-side compression at /api/files/compress
 */

export interface ClientCompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1 for Canvas, 1-100 for server
  format?: "webp" | "jpeg" | "png";
  /** Use server-side compression even if client can handle it */
  forceServer?: boolean;
  /** Target max file size in bytes (default: 1MB) */
  maxFileSize?: number;
}

export interface ClientCompressionResult {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  size: number;
  originalSize: number;
  format: string;
  wasCompressed: boolean;
}

/**
 * Compress an image file on the client side using Canvas API
 */
export async function compressImageClient(
  file: File,
  options: ClientCompressionOptions = {}
): Promise<ClientCompressionResult> {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.8,
    format = "webp",
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calculate new dimensions
      let { width, height } = img;
      const aspectRatio = width / height;

      if (width > maxWidth) {
        width = maxWidth;
        height = width / aspectRatio;
      }
      if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
      }

      // Create canvas and draw resized image
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      // Use better quality scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob
      const mimeType = format === "jpeg" ? "image/jpeg" : format === "png" ? "image/png" : "image/webp";
      const qualityForCanvas = format === "png" ? undefined : quality;

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to create blob"));
            return;
          }

          const dataUrl = canvas.toDataURL(mimeType, qualityForCanvas);

          resolve({
            blob,
            dataUrl,
            width,
            height,
            size: blob.size,
            originalSize: file.size,
            format,
            wasCompressed: blob.size < file.size,
          });
        },
        mimeType,
        qualityForCanvas
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

/**
 * Compress using server-side API (fallback or for complex images)
 */
export async function compressImageServer(
  imageUrl: string,
  options: ClientCompressionOptions = {}
): Promise<{
  dataUrl: string;
  format: string;
  size: number;
  originalSize: number;
  width: number;
  height: number;
  compressionRatio: number;
}> {
  const response = await fetch("/api/files/compress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageUrl,
      format: options.format || "webp",
      quality: options.quality || 80,
      maxWidth: options.maxWidth || 1920,
      maxHeight: options.maxHeight || 1920,
    }),
  });

  if (!response.ok) {
    throw new Error("Server compression failed");
  }

  return response.json();
}

/**
 * Smart compression - tries client first, falls back to server
 */
export async function compressImageSmart(
  file: File,
  options: ClientCompressionOptions = {}
): Promise<ClientCompressionResult> {
  const {
    forceServer = false,
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.8,
    format = "webp",
    maxFileSize = 1024 * 1024, // 1MB target
  } = options;

  // If file is small enough and not forcing server, use client compression
  if (!forceServer && file.size <= maxFileSize * 2) {
    try {
      const result = await compressImageClient(file, {
        maxWidth,
        maxHeight,
        quality,
        format,
      });

      // If compression worked and we're under the target size, return it
      if (result.wasCompressed && result.size <= maxFileSize) {
        return result;
      }
    } catch (err) {
      console.warn("[ImageCompression] Client compression failed, trying server:", err);
    }
  }

  // Fall back to server-side compression
  const dataUrl = URL.createObjectURL(file);
  try {
    const result = await compressImageServer(dataUrl, {
      format,
      quality: (quality * 100) as unknown as number,
      maxWidth,
      maxHeight,
    });

    // Convert dataUrl back to blob
    const response = await fetch(result.dataUrl);
    const blob = await response.blob();

    return {
      blob,
      dataUrl: result.dataUrl,
      width: result.width,
      height: result.height,
      size: result.size,
      originalSize: file.size,
      format: result.format,
      wasCompressed: result.size < file.size,
    };
  } finally {
    URL.revokeObjectURL(dataUrl);
  }
}

/**
 * Check if browser supports Canvas API for image compression
 */
export function supportsClientCompression(): boolean {
  const canvas = document.createElement("canvas");
  return (
    typeof canvas.toBlob === "function" &&
    typeof canvas.toDataURL === "function"
  );
}

/**
 * Determine if an image needs compression based on size
 */
export function needsCompression(file: File, maxSize: number = 1024 * 1024): boolean {
  return file.size > maxSize;
}
