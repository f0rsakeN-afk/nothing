/**
 * Settings - Export User Data
 * GET /api/settings/export - Download all user data as ZIP
 */

import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/src/stack/server";
import prisma from "@/lib/prisma";
import JSZip from "jszip";

export async function GET(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser({ tokenStore: request });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prismaUser = await prisma.user.findUnique({
      where: { stackId: user.id },
      include: {
        // Core user data
        settings: true,
        customize: true,
        notifications: true,
        notificationPrefs: true,

        // Projects
        projects: {
          select: {
            id: true,
            name: true,
            description: true,
            createdAt: true,
            updatedAt: true,
          },
        },

        // Chats with messages
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

        // Feedback
        feedbacks: {
          select: {
            id: true,
            rating: true,
            comment: true,
            email: true,
            createdAt: true,
          },
        },

        // Reports
        reports: {
          select: {
            id: true,
            reason: true,
            description: true,
            email: true,
            createdAt: true,
          },
        },

        // MCP servers
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
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

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

    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 9 },
    });

    return new Response(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="eryx-data-${date}.zip"`,
        "Content-Length": zipBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Export data error:", error);
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 });
  }
}
