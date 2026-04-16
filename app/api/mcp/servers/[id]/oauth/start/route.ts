import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/auth';
import { randomBytes, createHash } from 'node:crypto';
import prisma from '@/lib/prisma';
import { validateMcpOAuthConfig, decryptOAuthValue } from '@/lib/mcp/server-config';

function isProUser(_planTier: string | null | undefined) {
  return true;
}

function toBase64Url(input: Buffer | string) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input, 'utf8');
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function createCodeVerifier() {
  return toBase64Url(randomBytes(48));
}

function createCodeChallenge(verifier: string) {
  return toBase64Url(createHash('sha256').update(verifier).digest());
}

function getAppOrigin(requestOrigin: string) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  return requestOrigin.replace(/\/+$/, '');
}

function getOAuthCallbackUri(origin: string) {
  return `${origin}/api/mcp/oauth/callback`;
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

    if (server.authType !== 'oauth') {
      return NextResponse.json({ error: 'Server auth type is not OAuth' }, { status: 400 });
    }

    const requestOrigin = new URL(request.url).origin;
    const origin = getAppOrigin(requestOrigin);
    const redirectUri = getOAuthCallbackUri(origin);

    // Get client credentials
    const clientId = server.oauthClientId?.trim();
    const clientSecret = decryptOAuthValue(server.oauthClientSecretEncrypted);

    if (!clientId) {
      return NextResponse.json({ error: 'OAuth Client ID not configured' }, { status: 400 });
    }

    // Build authorization URL based on provider
    // Most providers use standard OAuth 2.0 with PKCE
    const verifier = createCodeVerifier();
    const challenge = createCodeChallenge(verifier);

    // Store verifier for later use (in state or Redis)
    const state = Buffer.from(JSON.stringify({
      serverId: id,
      userId: user.id,
      verifier,
      exp: Date.now() + 10 * 60 * 1000, // 10 min expiry
    })).toString('base64');

    // Determine the authorization URL based on the server URL
    const serverUrl = new URL(server.url);
    let authorizationUrl: string;

    // Handle common providers
    if (serverUrl.hostname.includes('github.com') || serverUrl.hostname === 'api.githubcopilot.com') {
      authorizationUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent('read:user repo workflow')}&state=${state}&code_challenge=${challenge}&code_challenge_method=S256`;
    } else if (serverUrl.hostname.includes('slack.com')) {
      authorizationUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent('users:read users:read.email channels:history chat:write groups:history im:history mpim:history search:read')}&state=${state}&code_challenge=${challenge}&code_challenge_method=S256`;
    } else if (serverUrl.hostname.includes('notion.so') || serverUrl.hostname === 'mcp.notion.com') {
      authorizationUrl = `https://api.notion.com/v1/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent('read:user content:read content:write user:email')}&response_type=code&state=${state}&code_challenge=${challenge}&code_challenge_method=S256`;
    } else if (serverUrl.hostname.includes('linear.app') || serverUrl.hostname === 'mcp.linear.app') {
      authorizationUrl = `https://linear.app/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent('read:user read:organization')}&state=${state}&code_challenge=${challenge}&code_challenge_method=S256`;
    } else {
      // Generic OAuth - use authorization URL from server config or construct from issuer
      if (server.oauthAuthorizationUrl) {
        authorizationUrl = server.oauthAuthorizationUrl;
      } else if (server.oauthIssuerUrl) {
        // Try to discover OIDC config
        authorizationUrl = `${server.oauthIssuerUrl}/oauth/authorize`;
      } else {
        return NextResponse.json({ error: 'Unable to determine OAuth authorization URL' }, { status: 400 });
      }

      const url = new URL(authorizationUrl);
      url.searchParams.set('client_id', clientId);
      url.searchParams.set('redirect_uri', redirectUri);
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('state', state);
      url.searchParams.set('code_challenge', challenge);
      url.searchParams.set('code_challenge_method', 'S256');

      if (server.oauthScopes) {
        url.searchParams.set('scope', server.oauthScopes);
      }

      authorizationUrl = url.toString();
    }

    return Response.json({ authorizationUrl });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to start OAuth flow:', error);
    return NextResponse.json({ error: 'Failed to start OAuth flow' }, { status: 500 });
  }
}
