/**
 * Export Service
 * Handles async data export job processing
 */

import JSZip from "jszip";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getS3Client } from "@/services/s3.service";
import prisma from "@/lib/prisma";

const S3_BUCKET = process.env.AWS_S3_BUCKET || "";
const EXPORT_EXPIRY_HOURS = 24;

interface ExportJobData {
  exportJobId: string;
  userId: string;
}

/**
 * Process an export job
 */
export async function processExportJob(data: ExportJobData): Promise<void> {
  const { exportJobId, userId } = data;

  // Update status to processing
  await prisma.exportJob.update({
    where: { id: exportJobId },
    data: { status: "PROCESSING" },
  });

  try {
    // Fetch all user data
    const prismaUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        settings: true,
        customize: true,
        notifications: true,
        notificationPrefs: true,
        projects: {
          select: {
            id: true,
            name: true,
            description: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        chats: {
          select: {
            id: true,
            title: true,
            visibility: true,
            createdAt: true,
            updatedAt: true,
            archivedAt: true,
            pinnedAt: true,
            messages: {
              orderBy: { createdAt: "asc" },
              select: {
                id: true,
                role: true,
                content: true,
                createdAt: true,
              },
            },
          },
          orderBy: { updatedAt: "desc" },
        },
        feedbacks: {
          select: {
            id: true,
            rating: true,
            comment: true,
            email: true,
            createdAt: true,
          },
        },
        reports: {
          select: {
            id: true,
            reason: true,
            description: true,
            email: true,
            createdAt: true,
          },
        },
        mcpServers: {
          select: {
            id: true,
            name: true,
            transportType: true,
            url: true,
            authType: true,
            isEnabled: true,
            lastTestedAt: true,
            lastError: true,
            createdAt: true,
          },
        },
      },
    });

    if (!prismaUser) {
      throw new Error("User not found");
    }

    // Generate ZIP
    const zip = new JSZip();
    const date = new Date().toISOString().split("T")[0];

    // Account info
    zip.file("account.json", JSON.stringify({
      email: prismaUser.email,
      createdAt: prismaUser.createdAt.toISOString(),
      isActive: prismaUser.isActive,
      plan: prismaUser.plan,
      planTier: prismaUser.planTier,
    }, null, 2));

    // Settings
    if (prismaUser.settings) {
      zip.file("settings.json", JSON.stringify(prismaUser.settings, null, 2));
    }

    // Customize
    if (prismaUser.customize) {
      zip.file("customize.json", JSON.stringify(prismaUser.customize, null, 2));
    }

    // Notifications
    zip.file("notifications.json", JSON.stringify(prismaUser.notifications, null, 2));

    // Notification preferences
    if (prismaUser.notificationPrefs) {
      zip.file("notification-preferences.json", JSON.stringify(prismaUser.notificationPrefs, null, 2));
    }

    // Projects
    zip.file("projects.json", JSON.stringify(prismaUser.projects, null, 2));

    // Conversations (with messages) - as JSON
    zip.file("conversations.json", JSON.stringify(prismaUser.chats, null, 2));

    // Individual chats as markdown files
    const chatsFolder = zip.folder("chats");
    for (const chat of prismaUser.chats) {
      const lines: string[] = [];
      lines.push(`# ${chat.title}`);
      lines.push("");
      lines.push(`Created: ${chat.createdAt.toLocaleString()}`);
      if (chat.visibility) lines.push(`Visibility: ${chat.visibility}`);
      if (chat.pinnedAt) lines.push(`Pinned: ${chat.pinnedAt}`);
      if (chat.archivedAt) lines.push(`Archived: ${chat.archivedAt}`);
      lines.push("");
      lines.push("---");
      lines.push("");

      for (const msg of chat.messages) {
        const role = msg.role === "user" ? "**You**" : "**Assistant**";
        lines.push(`## ${role}`);
        lines.push("");
        lines.push(msg.content);
        lines.push("");
      }

      // Sanitize filename
      const safeTitle = chat.title.replace(/[^a-zA-Z0-9\-_\s]/g, "").slice(0, 50);
      chatsFolder?.file(`${safeTitle}-${chat.id.slice(0, 8)}.md`, lines.join("\n"));
    }

    // Feedback
    zip.file("feedback.json", JSON.stringify(prismaUser.feedbacks, null, 2));

    // Reports
    zip.file("reports.json", JSON.stringify(prismaUser.reports, null, 2));

    // MCP servers
    zip.file("mcp-servers.json", JSON.stringify(prismaUser.mcpServers, null, 2));

    // Generate README
    zip.file("README.txt", `Eryx Data Export
Generated: ${new Date().toISOString()}
User: ${prismaUser.email}

Files:
- account.json              : Your account information
- settings.json            : Your app settings
- customize.json           : Your customization preferences
- notifications.json       : Your notifications
- notification-preferences.json: Notification settings
- projects.json            : Your projects
- conversations.json       : Your conversations (with messages)
- feedback.json            : Your feedback submissions
- reports.json             : Your bug reports
- mcp-servers.json         : Your MCP server configurations
- chats/                   : Individual conversation exports (Markdown)

This export contains all your Eryx account data.`);

    // Generate ZIP buffer
    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 9 },
    });

    // Upload to S3
    const s3Key = `exports/${userId}/${exportJobId}/eryx-data-${date}.zip`;
    const client = getS3Client();
    await client.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key,
      Body: zipBuffer,
      ContentType: "application/zip",
    }));

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + EXPORT_EXPIRY_HOURS);

    // Update job as completed
    await prisma.exportJob.update({
      where: { id: exportJobId },
      data: {
        status: "COMPLETED",
        s3Key,
        expiresAt,
      },
    });

    console.log(`[Export] Job ${exportJobId} completed, S3 key: ${s3Key}`);
  } catch (error) {
    console.error(`[Export] Job ${exportJobId} failed:`, error);

    // Update job as failed
    await prisma.exportJob.update({
      where: { id: exportJobId },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });

    throw error;
  }
}

/**
 * Create an export job record and queue it
 */
export async function createExportJob(userId: string): Promise<string> {
  // Create job record
  const job = await prisma.exportJob.create({
    data: {
      userId,
      status: "PENDING",
    },
  });

  // Queue the job
  const { queueExportJob } = await import("@/services/queue.service");
  await queueExportJob(job.id, userId);

  return job.id;
}

/**
 * Get export job status
 */
export async function getExportJobStatus(jobId: string, userId: string) {
  const job = await prisma.exportJob.findFirst({
    where: {
      id: jobId,
      userId,
    },
  });

  if (!job) {
    return null;
  }

  return {
    id: job.id,
    status: job.status,
    s3Key: job.s3Key,
    error: job.error,
    expiresAt: job.expiresAt?.toISOString() ?? null,
    createdAt: job.createdAt.toISOString(),
  };
}

/**
 * Get presigned download URL for completed export
 */
export async function getExportDownloadUrl(jobId: string, userId: string): Promise<string | null> {
  const job = await prisma.exportJob.findFirst({
    where: {
      id: jobId,
      userId,
      status: "COMPLETED",
    },
  });

  if (!job || !job.s3Key) {
    return null;
  }

  // Check if expired
  if (job.expiresAt && job.expiresAt < new Date()) {
    return null;
  }

  const { getPresignedDownloadUrl } = await import("@/services/s3.service");
  return getPresignedDownloadUrl(job.s3Key);
}