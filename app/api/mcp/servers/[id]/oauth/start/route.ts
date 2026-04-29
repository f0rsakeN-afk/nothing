import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { buildMcpOAuthAuthorizationUrl } from '@/lib/mcp/oauth';
import { validateMcpOAuthConfig } from '@/lib/mcp/server-config';
import { injectManagedOAuthCredentials } from '@/lib/mcp/managed-credentials';
import { checkApiRateLimit, rateLimitResponse } from '@/lib/rate-limit';

function isProUser(planTier: string | null | undefined) {
  return planTier === 'PRO' || planTier === 'ENTERPRISE' || planTier === 'BASIC';
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting
    const rateLimit = await checkApiRateLimit(request);
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.resetAt);
    }

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

    if (server.authType !== 'oauth') {
      return NextResponse.json({ error: 'Server auth type is not OAuth' }, { status: 400 });
    }

    // Inject credentials from env vars for managed OAuth apps (GitHub, Box, Dropbox, Slack, HubSpot)
    const serverWithManaged = injectManagedOAuthCredentials(server);

    validateMcpOAuthConfig({
      authType: 'oauth',
      oauthIssuerUrl: serverWithManaged.oauthIssuerUrl ?? undefined,
      oauthAuthorizationUrl: serverWithManaged.oauthAuthorizationUrl ?? undefined,
      oauthTokenUrl: serverWithManaged.oauthTokenUrl ?? undefined,
      oauthClientId: serverWithManaged.oauthClientId ?? undefined,
    });

    const requestOrigin = new URL(request.url).origin;
    const { authorizationUrl } = await buildMcpOAuthAuthorizationUrl({
      server: serverWithManaged,
      userId: user.id,
      requestOrigin,
    });

    return Response.json({ authorizationUrl });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to start OAuth flow:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to start OAuth flow' }, { status: 500 });
  }
}
