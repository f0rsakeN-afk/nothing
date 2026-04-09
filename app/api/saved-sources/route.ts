/**
 * Saved Sources API
 * Bookmark and manage saved search sources
 */

import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/src/stack/server";
import prisma from "@/lib/prisma";
import { successResponse, notFoundError, badRequestError, createdResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser({ tokenStore: request });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const savedSources = await prisma.savedSource.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        sourceId: true,
        title: true,
        url: true,
        snippet: true,
        source: true,
        createdAt: true,
      },
    });

    return successResponse(savedSources);
  } catch (error) {
    console.error("Error fetching saved sources:", error);
    return NextResponse.json(
      { error: "Failed to fetch saved sources" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser({ tokenStore: request });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sourceId, title, url, snippet, source } = body;

    if (!sourceId || !title || !url) {
      return badRequestError("Missing required fields: sourceId, title, url");
    }

    // Check if already saved
    const existing = await prisma.savedSource.findUnique({
      where: {
        userId_sourceId: {
          userId: user.id,
          sourceId,
        },
      },
    });

    if (existing) {
      return badRequestError("Source already saved");
    }

    const savedSource = await prisma.savedSource.create({
      data: {
        userId: user.id,
        sourceId,
        title,
        url,
        snippet: snippet || "",
        source: source || "other",
      },
    });

    return createdResponse(savedSource);
  } catch (error) {
    console.error("Error saving source:", error);
    return NextResponse.json(
      { error: "Failed to save source" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser({ tokenStore: request });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return badRequestError("Missing source ID");
    }

    // Verify ownership
    const existing = await prisma.savedSource.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return notFoundError("Saved source");
    }

    await prisma.savedSource.delete({ where: { id } });

    return successResponse({ deleted: true });
  } catch (error) {
    console.error("Error deleting saved source:", error);
    return NextResponse.json(
      { error: "Failed to delete saved source" },
      { status: 500 }
    );
  }
}
