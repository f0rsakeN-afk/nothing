/**
 * File Delete API
 * DELETE /api/files/:id - Delete file and clear from all contexts
 */

import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/src/stack/server";
import prisma from "@/lib/prisma";
import { invalidateProjectContext } from "@/services/project-context.service";
import { deleteFileEmbeddings } from "@/lib/stack-server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await stackServerApp.getUser({ tokenStore: request });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: fileId } = await params;

    // Find file with ownership verification via separate queries
    const file = await prisma.file.findFirst({
      where: { id: fileId },
      include: {
        project: { select: { id: true, name: true, userId: true } },
        projectFiles: { select: { projectId: true } },
        chatFiles: { select: { chatId: true } },
        messageFiles: { select: { messageId: true } },
      },
    });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Verify ownership - check project ownership
    const isProjectOwner = file.project?.userId === user.id;

    // Check chat ownership via chat files
    const chatFileIds = file.chatFiles.map((cf) => cf.chatId);
    const chatOwnership = await prisma.chat.count({
      where: { id: { in: chatFileIds }, userId: user.id },
    });
    const isChatOwner = chatOwnership > 0;

    // Check message ownership via message files
    const messageFileIds = file.messageFiles.map((mf) => mf.messageId);
    const messageOwnership = await prisma.message.count({
      where: {
        id: { in: messageFileIds },
        chat: { userId: user.id },
      },
    });
    const isMessageOwner = messageOwnership > 0;

    // No valid ownership found
    if (!isProjectOwner && !isChatOwner && !isMessageOwner) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Build warning message if file is in project context
    let warning: string | null = null;
    if (file.project) {
      warning = `This file is used in project "${file.project.name}". Removing it will clear its context from the project.`;
    }

    // Delete embeddings first
    await deleteFileEmbeddings(fileId);

    // Invalidate project context cache if file was in a project
    if (file.project) {
      await invalidateProjectContext(file.project.id);
    }

    // Clear extracted content (remove from AI context)
    await prisma.file.update({
      where: { id: fileId },
      data: {
        extractedContent: null,
        contentPreview: null,
        tokenCount: null,
        status: "READY",
      },
    });

    // Remove all file associations
    await prisma.messageFile.deleteMany({
      where: { fileId },
    });

    await prisma.chatFile.deleteMany({
      where: { fileId },
    });

    await prisma.projectFile.deleteMany({
      where: { fileId },
    });

    return NextResponse.json({ success: true, warning });
  } catch (error) {
    console.error("[FileDelete] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}
