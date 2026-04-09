/**
 * Image Caching Service
 * Uses Node.js fs/path/os modules - NOT for Edge runtime
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import redis, { KEYS, TTL } from "./redis";

const IMAGE_CACHE_DIR = path.join(os.tmpdir(), "eryx-image-cache");

// Ensure cache directory exists
function ensureCacheDir() {
  if (!fs.existsSync(IMAGE_CACHE_DIR)) {
    fs.mkdirSync(IMAGE_CACHE_DIR, { recursive: true });
  }
}

/**
 * Get cached image path - downloads and caches if not present
 */
export async function getCachedImage(imageUrl: string): Promise<string | null> {
  const cacheKey = KEYS.imageCache(imageUrl);

  // Check Redis for cached path
  try {
    const cachedPath = await redis.get(cacheKey);
    if (cachedPath && fs.existsSync(cachedPath)) {
      return cachedPath;
    }
  } catch {
    // Cache miss - proceed to download
  }

  // Download image
  try {
    const response = await fetch(imageUrl, {
      headers: {
        Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/jpeg";

    // Determine extension
    const extMap: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/gif": ".gif",
      "image/webp": ".webp",
      "image/svg+xml": ".svg",
    };
    const ext = extMap[contentType] || ".jpg";

    // Create cache file
    ensureCacheDir();
    const filename = `${crypto.randomUUID()}${ext}`;
    const filepath = path.join(IMAGE_CACHE_DIR, filename);

    fs.writeFileSync(filepath, Buffer.from(buffer));

    // Cache path in Redis (7 day TTL)
    await redis.setex(cacheKey, TTL.imageCache, filepath);

    return filepath;
  } catch {
    return null;
  }
}

/**
 * Clear old images from cache (call periodically)
 */
export async function clearOldImageCache(maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
  ensureCacheDir();

  const files = fs.readdirSync(IMAGE_CACHE_DIR);
  const now = Date.now();

  for (const file of files) {
    const filepath = path.join(IMAGE_CACHE_DIR, file);
    const stats = fs.statSync(filepath);
    if (now - stats.mtimeMs > maxAgeMs) {
      fs.unlinkSync(filepath);
    }
  }
}
