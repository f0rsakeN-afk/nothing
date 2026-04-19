import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createMCPClient } from '@ai-sdk/mcp';
import { getMcpAuthHeaders } from '@/lib/mcp/auth-headers';
import { validateMcpServerUrl } from '@/lib/mcp/server-config';
import { injectManagedOAuthCredentials } from '@/lib/mcp/managed-credentials';

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

    validateMcpServerUrl(server.url);

    const serverWithManaged = injectManagedOAuthCredentials(server);
    const headers = await getMcpAuthHeaders({
      id: serverWithManaged.id,
      authType: serverWithManaged.authType as 'none' | 'bearer' | 'header' | 'oauth',
      encryptedCredentials: serverWithManaged.encryptedCredentials,
      oauthAccessTokenEncrypted: serverWithManaged.oauthAccessTokenEncrypted,
      oauthRefreshTokenEncrypted: serverWithManaged.oauthRefreshTokenEncrypted,
      oauthAccessTokenExpiresAt: serverWithManaged.oauthAccessTokenExpiresAt,
      oauthIssuerUrl: serverWithManaged.oauthIssuerUrl,
      oauthTokenUrl: serverWithManaged.oauthTokenUrl,
      oauthClientId: serverWithManaged.oauthClientId,
      oauthClientSecretEncrypted: serverWithManaged.oauthClientSecretEncrypted,
    }, user.id);

    const client = await createMCPClient({
      transport: {
        type: server.transportType as 'http' | 'sse',
        url: server.url,
        headers,
      },
    });

    try {
      const toolsResult = await client.listTools();
      const tools = toolsResult.tools.map((t) => ({
        name: t.name,
        title: t.title ?? null,
        description: t.description ?? null,
      }));
      return Response.json({ ok: true, tools });
    } finally {
      await client.close();
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to fetch MCP tools:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
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
      where: { id, userId: user.id },
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
