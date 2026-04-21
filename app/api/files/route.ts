/**
 * Files API
 * GET /api/files - List all user files
 * DELETE handled in [id]/route.ts
 */

import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser, AccountDeactivatedError } from "@/lib/auth";
import { rateLimit, rateLimitResponse } from "@/services/rate-limit.service";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, "default");
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.resetAt);
    }

    // Authenticate
    let user;
    try {
      user = await getOrCreateUser(request);
    } catch (error) {
      if (error instanceof AccountDeactivatedError) {
        return NextResponse.json({ error: "Account deactivated" }, { status: 403 });
      }
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const cursor = searchParams.get("cursor");
    const projectId = searchParams.get("projectId");
    const type = searchParams.get("type"); // filter by file type

    // Run all three file ID queries in parallel
    const [projectFileIds, chatFileIds, messageFileRecords] = await Promise.all([
      prisma.projectFile.findMany({
        where: { project: { userId: user.id } },
        select: { fileId: true },
      }),
      prisma.chatFile.findMany({
        where: { chat: { userId: user.id } },
        select: { fileId: true },
      }),
      prisma.messageFile.findMany({
        where: { message: { chat: { userId: user.id } } },
        select: { fileId: true },
      }),
    ]);

    // Combine and dedupe file IDs
    const allFileIds = [
      ...new Set([
        ...projectFileIds.map((f) => f.fileId),
        ...chatFileIds.map((f) => f.fileId),
        ...messageFileRecords.map((f) => f.fileId),
      ]),
    ];

    if (allFileIds.length === 0) {
      return NextResponse.json({ files: [], nextCursor: null, totalCount: 0 });
    }

    // Fetch files with pagination
    const files = await prisma.file.findMany({
      where: {
        id: { in: allFileIds },
        // Optional filters
        ...(projectId ? { projectId } : {}),
        ...(type ? { type } : {}),
      },
      select: {
        id: true,
        name: true,
        type: true,
        url: true,
        status: true,
        extractedContent: true,
        contentPreview: true,
        tokenCount: true,
        createdAt: true,
        projectId: true,
        project: {
          select: { id: true, name: true },
        },
        _count: {
          select: {
            chatFiles: true,
            messageFiles: true,
            projectFiles: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 100),
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    // Get total count for pagination
    const totalCount = allFileIds.length;

    // Batch fetch all chat and message associations for all files at once
    const [allChatFiles, allMessageFiles] = await Promise.all([
      prisma.chatFile.findMany({
        where: { fileId: { in: files.map((f) => f.id) } },
        select: { fileId: true, chatId: true },
      }),
      prisma.messageFile.findMany({
        where: { fileId: { in: files.map((f) => f.id) } },
        select: { fileId: true, message: { select: { chatId: true } } },
      }),
    ]);

    // Group chat IDs by file ID
    const chatIdsByFile = new Map<string, string[]>();
    const chatIdsForAllFiles = new Set<string>();

    for (const cf of allChatFiles) {
      const existing = chatIdsByFile.get(cf.fileId) || [];
      existing.push(cf.chatId);
      chatIdsByFile.set(cf.fileId, existing);
      chatIdsForAllFiles.add(cf.chatId);
    }

    for (const mf of allMessageFiles) {
      const existing = chatIdsByFile.get(mf.fileId) || [];
      existing.push(mf.message.chatId);
      chatIdsByFile.set(mf.fileId, existing);
      chatIdsForAllFiles.add(mf.message.chatId);
    }

    // Build final response with context
    const filesWithContext = files.map((file) => ({
      ...file,
      chatIds: [...new Set(chatIdsByFile.get(file.id) || [])],
      contextCount: file._count.chatFiles + file._count.messageFiles + file._count.projectFiles,
    }));

    const nextCursor = files.length === limit ? files[files.length - 1].id : null;

    return NextResponse.json({
      files: filesWithContext,
      nextCursor,
      totalCount,
    });
  } catch (error) {
    logger.error("Error fetching files", error as Error, { userId: "unknown" });
    return NextResponse.json(
      { error: "Failed to fetch files" },
      { status: 500 }
    );
  }
}