/**
 * Settings - Export User Data
 * POST /api/settings/export - Start async export job
 * GET /api/settings/export - Get export job status and download URL
 */

import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/src/stack/server";
import prisma from "@/lib/prisma";
import { notFoundError, unauthorizedError, internalError } from "@/lib/api-response";
import {
  createExportJob,
  getExportJobStatus,
  getExportDownloadUrl,
} from "@/services/export.service";

export async function POST(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser({ tokenStore: request });
    if (!user) {
      return unauthorizedError();
    }

    const prismaUser = await prisma.user.findUnique({
      where: { stackId: user.id },
      select: { id: true },
    });

    if (!prismaUser) {
      return notFoundError("User");
    }

    // Check if user already has a pending/processing export
    const existingJob = await prisma.exportJob.findFirst({
      where: {
        userId: prismaUser.id,
        status: { in: ["PENDING", "PROCESSING"] },
      },
    });

    if (existingJob) {
      return NextResponse.json({
        error: "Export already in progress",
        code: "EXPORT_IN_PROGRESS",
        message: "An export is already being processed. Please wait for it to complete.",
        jobId: existingJob.id,
        status: existingJob.status,
      }, { status: 409 });
    }

    // Create and queue export job
    const jobId = await createExportJob(prismaUser.id);

    return NextResponse.json({
      status: "processing",
      jobId,
      message: "Export job started. Use GET /api/settings/export?jobId=xxx to check status.",
    }, { status: 202 });
  } catch (error) {
    console.error("Export error:", error);
    return internalError("Failed to start export");
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser({ tokenStore: request });
    if (!user) {
      return unauthorizedError();
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    const prismaUser = await prisma.user.findUnique({
      where: { stackId: user.id },
      select: { id: true },
    });

    if (!prismaUser) {
      return notFoundError("User");
    }

    // If jobId provided, get specific job status
    if (jobId) {
      const jobStatus = await getExportJobStatus(jobId, prismaUser.id);

      if (!jobStatus) {
        return notFoundError("Export job");
      }

      // If completed, get download URL
      let downloadUrl = null;
      if (jobStatus.status === "COMPLETED") {
        downloadUrl = await getExportDownloadUrl(jobId, prismaUser.id);
      }

      return NextResponse.json({
        ...jobStatus,
        downloadUrl,
      });
    }

    // No jobId - return most recent export or list exports
    const recentJob = await prisma.exportJob.findFirst({
      where: { userId: prismaUser.id },
      orderBy: { createdAt: "desc" },
    });

    if (!recentJob) {
      return NextResponse.json({
        hasExports: false,
        message: "No exports found. Use POST /api/settings/export to start an export.",
      });
    }

    let downloadUrl = null;
    if (recentJob.status === "COMPLETED") {
      downloadUrl = await getExportDownloadUrl(recentJob.id, prismaUser.id);
    }

    return NextResponse.json({
      id: recentJob.id,
      status: recentJob.status,
      error: recentJob.error,
      expiresAt: recentJob.expiresAt?.toISOString() ?? null,
      createdAt: recentJob.createdAt.toISOString(),
      downloadUrl,
    });
  } catch (error) {
    console.error("Export status error:", error);
    return internalError("Failed to get export status");
  }
}