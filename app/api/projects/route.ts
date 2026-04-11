import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    // Validate auth and get user
    const user = await getOrCreateUser(request);

    const { searchParams } = new URL(request.url);
    const archived = searchParams.get("archived");
    const showArchived = archived === "true";

    const projects = await prisma.project.findMany({
      where: {
        userId: user.id,
        ...(showArchived
          ? { archivedAt: { not: null } }
          : { archivedAt: null }),
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        instruction: true,
        createdAt: true,
        updatedAt: true,
        archivedAt: true,
      },
    });

    return NextResponse.json({
      projects: projects.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        archivedAt: p.archivedAt?.toISOString() ?? null,
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validate auth and get user
    const user = await getOrCreateUser(request);

    const body = await request.json();
    const { name, description, instruction } = body;

    if (!name || name.length < 2 || name.length > 50) {
      return NextResponse.json(
        { error: "Name must be 2-50 characters" },
        { status: 400 }
      );
    }

    const project = await prisma.project.create({
      data: {
        name,
        description: description || "",
        instruction: instruction || null,
        userId: user.id,
      },
    });

    return NextResponse.json(
      {
        id: project.id,
        name: project.name,
        description: project.description,
        instruction: project.instruction,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
        archivedAt: project.archivedAt?.toISOString() ?? null,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
