/**
 * Initialize Multipart Upload
 * POST /api/files/upload/init
 */

import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/src/stack/server";
import { createMultipartUploadInit, calculateParts, getFileSizeLimit, isContentTypeSupported } from "@/services/s3.service";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser({ tokenStore: request });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { fileName, fileType, fileSize, projectId } = body;

    if (!fileName || !fileType || !fileSize) {
      return NextResponse.json(
        { error: "Missing required fields: fileName, fileType, fileSize" },
        { status: 400 }
      );
    }

    // Validate content type
    if (!isContentTypeSupported(fileType)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${fileType}` },
        { status: 400 }
      );
    }

    // Validate file size
    const maxSize = getFileSizeLimit(fileType);
    if (fileSize > maxSize) {
      return NextResponse.json(
        { error: `File too large. Max size for ${fileType}: ${maxSize / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Generate file ID
    const fileId = crypto.randomUUID();

    // Initialize S3 multipart upload
    const { uploadId, objectKey } = await createMultipartUploadInit(
      user.id,
      projectId,
      fileId,
      fileName,
      fileType
    );

    // Calculate number of parts
    const totalParts = calculateParts(fileSize);

    // Create file record in database
    const file = await prisma.file.create({
      data: {
        id: fileId,
        name: fileName,
        url: objectKey, // Will be updated with final URL after completion
        type: fileType,
        s3Key: objectKey,
        s3Bucket: process.env.AWS_S3_BUCKET,
        uploadId,
        status: "PENDING_UPLOAD",
        ...(projectId && { projectId }),
      },
    });

    return NextResponse.json({
      fileId: file.id,
      uploadId,
      objectKey,
      totalParts,
      status: "PENDING_UPLOAD",
    });
  } catch (error) {
    console.error("Upload init error:", error);
    return NextResponse.json(
      { error: "Failed to initialize upload" },
      { status: 500 }
    );
  }
}
