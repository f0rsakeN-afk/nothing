/**
 * Get Presigned URLs for Multipart Upload
 * GET /api/files/upload/presigned?uploadId=&objectKey=
 */

import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/src/stack/server";
import { getMultipartPresignedUrls } from "@/services/s3.service";
import { checkRateLimitWithAuth, rateLimitResponse } from "@/lib/rate-limit";

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
    const uploadId = searchParams.get("uploadId");
    const objectKey = searchParams.get("objectKey");
    const totalParts = parseInt(searchParams.get("totalParts") || "1");

    if (!uploadId || !objectKey) {
      return NextResponse.json(
        { error: "Missing required params: uploadId, objectKey" },
        { status: 400 }
      );
    }

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
