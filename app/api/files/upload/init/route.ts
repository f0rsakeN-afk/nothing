/**
 * Initialize Multipart Upload
 * POST /api/files/upload/init
 */

import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/src/stack/server";
import { createMultipartUploadInit, calculateParts, getFileSizeLimit, isContentTypeSupported } from "@/services/s3.service";
import prisma from "@/lib/prisma";
import { getUserLimits } from "@/services/limit.service";
import { checkRateLimitWithAuth, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    // Check rate limit
    const rateLimit = await checkRateLimitWithAuth(request, "upload");
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.resetAt);
    }

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

    // Get user's plan limits
    const limits = await getUserLimits(user.id);

    // Check if attachments feature is available
    if (limits.maxAttachmentsPerChat === 0) {
      return NextResponse.json(
        {
          error: "File attachments not available",
          code: "ATTACHMENTS_NOT_AVAILABLE",
          message: "Upgrade to a paid plan to attach files to your conversations.",
          action: "upgrade",
          upgradeTo: "Basic",
        },
        { status: 403 }
      );
    }

    // Validate file size against user's plan limit
    const fileSizeMb = fileSize / 1024 / 1024;
    if (limits.maxFileSizeMb > 0 && fileSizeMb > limits.maxFileSizeMb) {
      return NextResponse.json(
        {
          error: "File too large",
          code: "FILE_SIZE_EXCEEDED",
          message: `Maximum file size is ${limits.maxFileSizeMb}MB on your plan.`,
          action: "upgrade",
          upgradeTo: limits.maxFileSizeMb === 1 ? "Basic" : limits.maxFileSizeMb === 5 ? "Pro" : null,
          limits: {
            maxFileSizeMb: limits.maxFileSizeMb,
            attempted: Math.round(fileSizeMb * 10) / 10,
          },
        },
        { status: 403 }
      );
    }

    // Also validate against S3 service limits
    const maxSize = getFileSizeLimit(fileType);
    if (fileSize > maxSize) {
      return NextResponse.json(
        { error: `File too large. Max size for ${fileType}: ${maxSize / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Check attachment count limit per chat if projectId provided
    if (projectId) {
      const chatId = await prisma.chat.findFirst({
        where: { projectId },
        orderBy: { updatedAt: "desc" },
        select: { id: true },
      });

      if (chatId) {
        const attachmentCount = await prisma.chatFile.count({
          where: { chatId: chatId.id },
        });

        if (limits.maxAttachmentsPerChat !== -1 && attachmentCount >= limits.maxAttachmentsPerChat) {
          return NextResponse.json(
            {
              error: "Attachment limit reached",
              code: "ATTACHMENT_LIMIT_REACHED",
              message: `You've reached the maximum of ${limits.maxAttachmentsPerChat} attachments per chat.`,
              action: "upgrade",
              upgradeTo: limits.maxAttachmentsPerChat === 3 ? "Basic" : limits.maxAttachmentsPerChat === 5 ? "Pro" : null,
              limits: {
                current: attachmentCount,
                max: limits.maxAttachmentsPerChat,
              },
            },
            { status: 403 }
          );
        }
      }
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
