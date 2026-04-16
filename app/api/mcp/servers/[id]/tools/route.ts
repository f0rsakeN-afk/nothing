import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/auth';
import { createMCPClient } from '@ai-sdk/mcp';
import prisma from '@/lib/prisma';
import { getMcpAuthHeaders } from '@/lib/mcp/auth-headers';

function isProUser(_planTier: string | null | undefined) {
  return true;
}

export async function GET(
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

    const server = await prisma.mcpUserServer.findFirst({
      where: { id, userId: user.id },
    });

    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }

    const headers = await getMcpAuthHeaders({
      authType: server.authType as 'none' | 'bearer' | 'header' | 'oauth',
      encryptedCredentials: server.encryptedCredentials,
      oauthAccessTokenEncrypted: server.oauthAccessTokenEncrypted,
      oauthRefreshTokenEncrypted: server.oauthRefreshTokenEncrypted,
      oauthAccessTokenExpiresAt: server.oauthAccessTokenExpiresAt,
      oauthIssuerUrl: server.oauthIssuerUrl,
    }, user.id);

    const client = await createMCPClient({
      transport: {
        type: server.transportType as 'http' | 'sse',
        url: server.url,
        headers,
      },
    });

    try {
      const tools = await client.tools();
      const toolList = Object.entries(tools).map(([name, def]) => ({
        name,
        title: (def as { name?: string }).name || name,
        description: (def as { description?: string }).description || null,
      }));

      return Response.json({ ok: true, tools: toolList });
    } finally {
      await client.close();
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to fetch MCP tools:', error);
    return NextResponse.json({ error: 'Failed to fetch tools' }, { status: 500 });
  }
}

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

    const server = await prisma.mcpUserServer.findFirst({
      where: { id, userId: user.id },
    });

    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }

    const body = await request.json() as { disabledTools: string[] };
    if (!Array.isArray(body.disabledTools)) {
      return NextResponse.json({ error: 'disabledTools must be an array' }, { status: 400 });
    }

    const updated = await prisma.mcpUserServer.update({
      where: { id },
      data: {
        disabledTools: body.disabledTools,
      },
    });

    return Response.json({
      ok: true,
      disabledTools: updated.disabledTools,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to update MCP tools:', error);
    return NextResponse.json({ error: 'Failed to update tools' }, { status: 500 });
  }
}
