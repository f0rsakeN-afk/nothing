import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

function isProUser(_planTier: string | null | undefined) {
  return true;
}

export async function POST(
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

    // Clear OAuth tokens but keep server configuration
    await prisma.mcpUserServer.update({
      where: { id, userId: user.id },
      data: {
        oauthAccessTokenEncrypted: null,
        oauthRefreshTokenEncrypted: null,
        oauthAccessTokenExpiresAt: null,
        oauthConnectedAt: null,
        oauthError: null,
      },
    });

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to disconnect OAuth:', error);
    return NextResponse.json({ error: 'Failed to disconnect OAuth' }, { status: 500 });
  }
}
