/**
 * Complete Multipart Upload
 * POST /api/files/upload/complete
 */

import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/src/stack/server";
import { completeMultipartUpload, getPresignedDownloadUrl } from "@/services/s3.service";
import { extractFileContent, getContentPreview, isExtractionSupported } from "@/services/extraction.service";
import { invalidateProjectContext } from "@/services/project-context.service";
import { createFileChunks } from "@/lib/stack-server";
import prisma from "@/lib/prisma";
import { checkRateLimitWithAuth } from "@/lib/rate-limit";
import { rateLimitError } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimit = await checkRateLimitWithAuth(request, "default");
    if (!rateLimit.success) {
      return rateLimitError(rateLimit);
    }

    const user = await stackServerApp.getUser({ tokenStore: request });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { fileId, uploadId, objectKey, parts } = body;

    if (!fileId || !uploadId || !objectKey) {
      return NextResponse.json(
        { error: "Missing required fields: fileId, uploadId, objectKey" },
        { status: 400 }
      );
    }

    // Verify file exists and is pending
    const file = await prisma.file.findFirst({
      where: { id: fileId, uploadId },
    });

    if (!file) {
      return NextResponse.json(
        { error: "File not found or upload not initialized" },
        { status: 404 }
      );
    }

    // Complete S3 multipart upload
    await completeMultipartUpload(objectKey, uploadId, parts || []);

    // Get download URL
    const downloadUrl = await getPresignedDownloadUrl(objectKey);

    // Update file status and URL
    await prisma.file.update({
      where: { id: fileId },
      data: {
        status: "PROCESSING",
        url: downloadUrl,
      },
    });

    // Extract content if supported type
    if (isExtractionSupported(file.type)) {
      // For now, we'll mark as READY and content can be extracted async
      // In production, this would be a background job
      try {
        // Get file from S3 and extract content
        const response = await fetch(downloadUrl);
        const buffer = await response.arrayBuffer();
        const result = await extractFileContent(Buffer.from(buffer), file.type);

        await prisma.file.update({
          where: { id: fileId },
          data: {
            status: result.extractionMethod === "failed" ? "FAILED" : "READY",
            extractedContent: result.text,
            contentPreview: getContentPreview(result.text),
            tokenCount: result.tokenCount,
          },
        });

        // Create embeddings for RAG if extraction succeeded
        if (result.extractionMethod !== "failed" && result.text) {
          await createFileChunks(fileId, result.text);
        }

        // Invalidate project context cache if attached to project
        if (file.projectId) {
          await invalidateProjectContext(file.projectId);
        }
      } catch (extractError) {
        console.error("Content extraction error:", extractError);
        await prisma.file.update({
          where: { id: fileId },
          data: { status: "FAILED" },
        });
      }
    } else {
      // Non-extractable file type - just mark as READY
      await prisma.file.update({
        where: { id: fileId },
        data: { status: "READY" },
      });
    }

    // Return updated file
    const updatedFile = await prisma.file.findUnique({
      where: { id: fileId },
    });

    return NextResponse.json({
      file: updatedFile,
      status: updatedFile?.status,
    });
  } catch (error) {
    console.error("Upload complete error:", error);
    return NextResponse.json(
      { error: "Failed to complete upload" },
      { status: 500 }
    );
  }
}
