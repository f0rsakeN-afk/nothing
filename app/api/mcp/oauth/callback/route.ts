import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getEncryptedOAuthValue } from '@/lib/mcp/server-config';

export async function GET(request: Request) {
  try {
    const user = await getOrCreateUser(request);

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(new URL(`/apps?mcpOauth=failed&message=${encodeURIComponent(error)}`, request.url));
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL('/apps?mcpOauth=failed&message=missing_params', request.url));
    }

    // Decode state to get server ID and verifier
    let stateData: { serverId: string; userId: string; verifier: string; exp: number };
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
    } catch {
      return NextResponse.redirect(new URL('/apps?mcpOauth=failed&message=invalid_state', request.url));
    }

    if (stateData.exp < Date.now()) {
      return NextResponse.redirect(new URL('/apps?mcpOauth=failed&message=state_expired', request.url));
    }

    if (stateData.userId !== user.id) {
      return NextResponse.redirect(new URL('/apps?mcpOauth=failed&message=user_mismatch', request.url));
    }

    const server = await prisma.mcpUserServer.findFirst({
      where: { id: stateData.serverId, userId: user.id },
    });

    if (!server) {
      return NextResponse.redirect(new URL('/apps?mcpOauth=failed&message=server_not_found', request.url));
    }

    // Exchange code for tokens
    // Note: This is a simplified implementation. Real implementations would
    // need to handle different OAuth providers properly.
    const tokenUrl = server.oauthTokenUrl || `${server.oauthIssuerUrl}/oauth/token`;
    const clientId = server.oauthClientId;
    const clientSecret = server.oauthClientSecretEncrypted;

    // Get redirect URI
    const requestOrigin = new URL(request.url).origin;
    const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
    const origin = configured || requestOrigin;
    const redirectUri = `${origin.replace(/\/+$/, '')}/api/mcp/oauth/callback`;

    // For now, we'll do a basic token exchange
    // Real implementation would need provider-specific token exchange
    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: clientId || '',
          ...(clientSecret ? { client_secret: clientSecret } : {}),
        }).toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OAuth token exchange failed:', errorText);
        return NextResponse.redirect(new URL(`/apps?mcpOauth=failed&message=${encodeURIComponent('Token exchange failed')}`, request.url));
      }

      const tokenData = await response.json() as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
      };

      // Store tokens
      await prisma.mcpUserServer.update({
        where: { id: stateData.serverId },
        data: {
          oauthAccessTokenEncrypted: getEncryptedOAuthValue(tokenData.access_token),
          oauthRefreshTokenEncrypted: tokenData.refresh_token ? getEncryptedOAuthValue(tokenData.refresh_token) : null,
          oauthAccessTokenExpiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null,
          oauthConnectedAt: new Date(),
          oauthError: null,
        },
      });

      return NextResponse.redirect(new URL('/apps?mcpOauth=success', request.url));
    } catch (err) {
      console.error('OAuth callback error:', err);
      return NextResponse.redirect(new URL('/apps?mcpOauth=failed&message=exchange_error', request.url));
    }
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(new URL('/apps?mcpOauth=failed&message=callback_error', request.url));
  }
}
