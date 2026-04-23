import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { exchangeMcpOAuthCode, verifyMcpOAuthState } from '@/lib/mcp/oauth';
import { injectManagedOAuthCredentials } from '@/lib/mcp/managed-credentials';

function redirectToApps(request: Request, status: 'success' | 'error', serverId?: string) {
  const origin = new URL(request.url).origin;
  const url = new URL('/apps', origin);
  url.searchParams.set('tab', 'my-servers');
  url.searchParams.set('mcpOauth', status);
  // Store error server-side only, not in URL to prevent log leakage
  return Response.redirect(url.toString(), 302);
}

export async function GET(request: Request) {
  let resolvedServerId: string | null = null;
  let userId: string | null = null;

  try {
    const user = await getOrCreateUser(request);
    userId = user.id;
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const state = requestUrl.searchParams.get('state');
    const oauthError = requestUrl.searchParams.get('error');
    const oauthErrorDesc = requestUrl.searchParams.get('error_description');

    if (oauthError) {
      return redirectToApps(request, 'error');
    }
    if (!code || !state) return redirectToApps(request, 'error');

    const payload = verifyMcpOAuthState({ state, expectedUserId: user.id });
    resolvedServerId = payload.serverId;

    const rawServer = await prisma.mcpUserServer.findFirst({
      where: { id: payload.serverId, userId: user.id },
    });
    if (!rawServer) return redirectToApps(request, 'error');
    if (rawServer.authType !== 'oauth') return redirectToApps(request, 'error');

    // Inject env-var credentials for managed OAuth apps
    const server = injectManagedOAuthCredentials(rawServer);

    await exchangeMcpOAuthCode({
      server,
      userId: user.id,
      code,
      verifier: payload.verifier,
      requestOrigin: requestUrl.origin,
    });

    await prisma.mcpUserServer.update({
      where: { id: payload.serverId, userId: user.id },
      data: { oauthError: null },
    });

    return redirectToApps(request, 'success');
  } catch (error) {
    if (userId && resolvedServerId) {
      await prisma.mcpUserServer.update({
        where: { id: resolvedServerId, userId },
        data: { oauthError: error instanceof Error ? error.message.slice(0, 1000) : 'OAuth callback failed' },
      }).catch(() => null);
    }
    return redirectToApps(request, 'error');
  }
}
