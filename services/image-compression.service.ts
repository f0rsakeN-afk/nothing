/**
 * Image Compression Service
 * Compresses and optimizes images before S3 upload
 *
 * Uses sharp for high-quality, fast image processing
 * Supports: JPEG, PNG, WebP, AVIF
 */

import sharp from "sharp";

export interface CompressionOptions {
  maxWidth?: number;        // Max width in pixels (default: 1920)
  maxHeight?: number;       // Max height in pixels (default: 1920)
  quality?: number;         // JPEG/WebP quality 1-100 (default: 80)
  format?: "jpeg" | "png" | "webp" | "avif";  // Output format (default: webp)
  removeMetadata?: boolean;  // Strip EXIF/metadata (default: true)
}

export interface CompressedImage {
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
  size: number;           // Bytes
  originalSize: number;   // Bytes
  compressionRatio: number; // How much we reduced it (0-1)
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 80,
  format: "webp",
  removeMetadata: true,
};

/**
 * Compress an image buffer
 */
export async function compressImage(
  imageBuffer: Buffer,
  options: CompressionOptions = {}
): Promise<CompressedImage> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const originalSize = imageBuffer.length;

  // Get image metadata
  const metadata = await sharp(imageBuffer).metadata();
  const originalWidth = metadata.width || 0;
  const originalHeight = metadata.height || 0;

  // Calculate if resize is needed
  let width = originalWidth;
  let height = originalHeight;

  if (width > opts.maxWidth || height > opts.maxHeight) {
    const ratio = Math.min(
      opts.maxWidth / width,
      opts.maxHeight / height
    );
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  // Build sharp pipeline
  let pipeline = sharp(imageBuffer)
    .resize(width, height, {
      fit: "inside",
      withoutEnlargement: true,
    });

  // Remove metadata to reduce size
  if (opts.removeMetadata) {
    pipeline = pipeline.rotate(); // Auto-rotate based on EXIF, then strip
  }

  // Apply format-specific compression
  let buffer: Buffer;
  let format: string;

  switch (opts.format) {
    case "jpeg":
      buffer = await pipeline.jpeg({ quality: opts.quality }).toBuffer();
      format = "jpeg";
      break;
    case "png":
      buffer = await pipeline.png({ compressionLevel: 9 }).toBuffer();
      format = "png";
      break;
    case "avif":
      buffer = await pipeline.avif({ quality: opts.quality }).toBuffer();
      format = "avif";
      break;
    case "webp":
    default:
      buffer = await pipeline.webp({ quality: opts.quality }).toBuffer();
      format = "webp";
      break;
  }

  return {
    buffer,
    width,
    height,
    format,
    size: buffer.length,
    originalSize,
    compressionRatio: 1 - buffer.length / originalSize,
  };
}

/**
 * Compress image from URL (fetch + compress)
 */
export async function compressImageFromUrl(
  url: string,
  options: CompressionOptions = {}
): Promise<CompressedImage> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  return compressImage(buffer, options);
}

/**
 * Generate multiple sizes for responsive images
 */
export async function generateResponsiveSizes(
  imageBuffer: Buffer,
  sizes: { name: string; maxWidth: number }[],
  options: Omit<CompressionOptions, "maxWidth" | "maxHeight"> = {}
): Promise<Map<string, CompressedImage>> {
  const results = new Map<string, CompressedImage>();

  await Promise.all(
    sizes.map(async ({ name, maxWidth }) => {
      const compressed = await compressImage(imageBuffer, {
        ...options,
        maxWidth,
        maxHeight: maxWidth, // Square-ish for simplicity
      });
      results.set(name, compressed);
    })
  );

  return results;
}

/**
 * Check if buffer is likely an image
 */
export function isImageBuffer(buffer: Buffer): boolean {
  // Check magic bytes
  const signatures = [
    { bytes: [0x89, 0x50, 0x4e, 0x47], type: "png" },
    { bytes: [0xff, 0xd8, 0xff], type: "jpeg" },
    { bytes: [0x52, 0x49, 0x46, 0x46], type: "webp" }, // RIFF....WEBP
    { bytes: [0x67, 0x69, 0x66], type: "gif" },
  ];

  for (const sig of signatures) {
    if (sig.bytes.every((byte, i) => buffer[i] === byte)) {
      return true;
    }
  }

  return false;
}

/**
 * Get image metadata without full decompression
 */
export async function getImageMetadata(
  imageBuffer: Buffer
): Promise<{ width: number; height: number; format: string; size: number }> {
  const metadata = await sharp(imageBuffer).metadata();
  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: metadata.format || "unknown",
    size: imageBuffer.length,
  };
}
