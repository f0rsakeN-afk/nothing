import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ serverId: string }> }
) {
  try {
    const user = await getOrCreateUser(request);
    const { serverId } = await params;

    const server = await prisma.mcpUserServer.findFirst({
      where: { id: serverId, userId: user.id },
    });

    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }

    if (server.authType !== 'oauth') {
      return NextResponse.json({ error: 'Server is not OAuth' }, { status: 400 });
    }

    const origin = new URL(request.url).origin;
    const redirectUri = `${origin}/api/mcp/oauth/callback`;

    return NextResponse.json({
      client_id: `${origin}/api/mcp/oauth/client-metadata/${serverId}`,
      redirect_uris: [redirectUri],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
      application_type: 'web',
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to get OAuth client metadata:', error);
    return NextResponse.json({ error: 'Failed to get OAuth client metadata' }, { status: 500 });
  }
}
