/**
 * Get Presigned URLs for Multipart Upload
 * GET /api/files/upload/presigned?uploadId=&objectKey=
 */

import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/src/stack/server";
import { getMultipartPresignedUrls } from "@/services/s3.service";
import { checkRateLimitWithAuth, rateLimitResponse } from "@/lib/rate-limit";
import { presignedUrlQuerySchema } from "@/lib/schemas";

export async function GET(request: NextRequest) {
  try {
    const rateLimit = await checkRateLimitWithAuth(request, "default");
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    const user = await stackServerApp.getUser({ tokenStore: request });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryParams = {
      uploadId: searchParams.get("uploadId") || "",
      objectKey: searchParams.get("objectKey") || "",
      totalParts: searchParams.get("totalParts") || "1",
    };

    const result = presignedUrlQuerySchema.safeParse(queryParams);
    if (!result.success) {
      const errors = result.error.issues.map((e) => ({
        field: e.path.map(String).join("."),
        message: e.message,
      }));
      return NextResponse.json(
        { error: "Validation failed", code: "VALIDATION_ERROR", details: errors },
        { status: 400 }
      );
    }

    const { uploadId, objectKey, totalParts } = result.data;

    // Get presigned URLs for each part
    const presignedParts = await getMultipartPresignedUrls(
      objectKey,
      uploadId,
      totalParts
    );

    return NextResponse.json({
      presignedParts,
    });
  } catch (error) {
    console.error("Presigned URL error:", error);
    return NextResponse.json(
      { error: "Failed to generate presigned URLs" },
      { status: 500 }
    );
  }
}
