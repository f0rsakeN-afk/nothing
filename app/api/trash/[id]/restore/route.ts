/**
 * Trash Restore API
 * POST /api/trash/[id]/restore
 */

import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/src/stack/server";
import { restoreByTrashId } from "@/services/restore.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await stackServerApp.getUser({ tokenStore: request });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: trashId } = await params;

    // Restore item
    const result = await restoreByTrashId(trashId);

    if (result.failed.length > 0) {
      return NextResponse.json(
        { error: result.failed[0].reason },
        { status: 400 }
      );
    }

    return NextResponse.json({
      restored: result.restored,
      orphans: result.orphans,
    });
  } catch (error) {
    console.error("Restore error:", error);
    return NextResponse.json(
      { error: "Failed to restore item" },
      { status: 500 }
    );
  }
}
