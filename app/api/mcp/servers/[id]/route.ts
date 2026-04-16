import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/auth';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { validateMcpServerUrl } from '@/lib/mcp/server-config';

function isProUser(_planTier: string | null | undefined) {
  return true;
}

const updateMcpServerSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  transportType: z.enum(['http', 'sse']).optional(),
  url: z.string().trim().url().optional(),
  authType: z.enum(['none', 'bearer', 'header', 'oauth']).optional(),
  headerName: z.string().optional(),
  headerValue: z.string().optional(),
  bearerToken: z.string().optional(),
  oauthClientId: z.string().optional(),
  isEnabled: z.boolean().optional(),
  disabledTools: z.array(z.string()).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getOrCreateUser(request);

    const { id } = await params;

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { planTier: true },
    });

    if (!dbUser || !isProUser(dbUser.planTier)) {
      return NextResponse.json({ error: 'Pro subscription required' }, { status: 403 });
    }

    const existing = await prisma.mcpUserServer.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }

    const input = updateMcpServerSchema.parse(await request.json());

    if (input.url) {
      validateMcpServerUrl(input.url);
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (input.name !== undefined) updateData.name = input.name.trim();
    if (input.transportType !== undefined) updateData.transportType = input.transportType;
    if (input.url !== undefined) updateData.url = input.url.trim();
    if (input.isEnabled !== undefined) updateData.isEnabled = input.isEnabled;
    if (input.disabledTools !== undefined) updateData.disabledTools = input.disabledTools;
    if (input.oauthClientId !== undefined) updateData.oauthClientId = input.oauthClientId.trim() || null;

    // Handle credential updates - for now we don't expose re-encryption
    // Users would need to delete and re-add the server to change credentials

    const updated = await prisma.mcpUserServer.update({
      where: { id },
      data: updateData,
    });

    return Response.json({
      server: {
        id: updated.id,
        name: updated.name,
        transportType: updated.transportType,
        url: updated.url,
        authType: updated.authType,
        isEnabled: updated.isEnabled,
        hasCredentials: Boolean(updated.encryptedCredentials),
        oauthClientId: updated.oauthClientId,
        lastTestedAt: updated.lastTestedAt,
        lastError: updated.lastError,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to update MCP server:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Invalid request' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update MCP server' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getOrCreateUser(request);

    const { id } = await params;

    const existing = await prisma.mcpUserServer.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }

    await prisma.mcpUserServer.delete({
      where: { id },
    });

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to delete MCP server:', error);
    return NextResponse.json({ error: 'Failed to delete MCP server' }, { status: 500 });
  }
}
