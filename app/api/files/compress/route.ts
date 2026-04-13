/**
 * Image Compression API
 * POST /api/files/compress
 *
 * Compresses images before upload to reduce storage costs and improve load times
 */

import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/src/stack/server";
import { compressImage, isImageBuffer } from "@/services/image-compression.service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser({ tokenStore: request });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { imageUrl, format, quality, maxWidth, maxHeight } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Missing imageUrl" },
        { status: 400 }
      );
    }

    // Fetch image from URL
    const response = await fetch(imageUrl);
    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch image" },
        { status: 400 }
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate it's an image
    if (!isImageBuffer(buffer)) {
      return NextResponse.json(
        { error: "Invalid image data" },
        { status: 400 }
      );
    }

    // Compress the image
    const compressed = await compressImage(buffer, {
      format: format || "webp",
      quality: quality || 80,
      maxWidth: maxWidth || 1920,
      maxHeight: maxHeight || 1920,
      removeMetadata: true,
    });

    // Return compressed image as base64 data URL
    const dataUrl = `data:image/${compressed.format};base64,${compressed.buffer.toString("base64")}`;

    return NextResponse.json({
      dataUrl,
      format: compressed.format,
      size: compressed.size,
      originalSize: compressed.originalSize,
      width: compressed.width,
      height: compressed.height,
      compressionRatio: compressed.compressionRatio,
    });
  } catch (error) {
    console.error("[Compress] Error:", error);
    return NextResponse.json(
      { error: "Failed to compress image" },
      { status: 500 }
    );
  }
}
