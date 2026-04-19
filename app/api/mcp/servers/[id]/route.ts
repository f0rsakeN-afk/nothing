import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/auth';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import {
  validateMcpServerUrl,
  getEncryptedMcpCredentials,
  getEncryptedOAuthValue,
  normalizeMcpScopes,
  validateMcpOAuthConfig,
  McpAuthType,
  McpTransportType,
} from '@/lib/mcp/server-config';

function isProUser(_planTier: string | null | undefined) {
  return true;
}

const optionalUrlField = z.preprocess(
  (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
  z.string().trim().url().optional(),
);

const updateMcpServerSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  transportType: z.enum(['http', 'sse']).optional(),
  url: z.string().trim().url().optional(),
  authType: z.enum(['none', 'bearer', 'header', 'oauth']).optional(),
  headerName: z.string().optional(),
  headerValue: z.string().optional(),
  bearerToken: z.string().optional(),
  oauthIssuerUrl: optionalUrlField,
  oauthAuthorizationUrl: optionalUrlField,
  oauthTokenUrl: optionalUrlField,
  oauthScopes: z.string().optional(),
  oauthClientId: z.string().optional(),
  oauthClientSecret: z.string().optional(),
  isEnabled: z.boolean().optional(),
  disabledTools: z.array(z.string()).optional(),
  clearOAuthTokens: z.boolean().optional(),
  clearCredentials: z.boolean().optional(),
});

function serializeMcpServer(server: {
  id: string;
  name: string;
  transportType: string;
  url: string;
  authType: string;
  isEnabled: boolean;
  disabledTools: string[] | null;
  lastTestedAt: Date | null;
  lastError: string | null;
  oauthConnectedAt: Date | null;
  oauthError: string | null;
  createdAt: Date;
  updatedAt: Date;
  encryptedCredentials: string | null;
  oauthClientId: string | null;
  oauthIssuerUrl: string | null;
  oauthAuthorizationUrl: string | null;
  oauthTokenUrl: string | null;
  oauthScopes: string | null;
  oauthAccessTokenEncrypted: string | null;
  oauthRefreshTokenEncrypted: string | null;
}) {
  return {
    id: server.id,
    name: server.name,
    transportType: server.transportType,
    url: server.url,
    authType: server.authType,
    isEnabled: server.isEnabled,
    disabledTools: server.disabledTools ?? [],
    hasCredentials: Boolean(server.encryptedCredentials),
    isOAuthConnected: Boolean(
      server.oauthAccessTokenEncrypted ||
      server.oauthRefreshTokenEncrypted ||
      server.oauthConnectedAt,
    ),
    oauthConfigured: server.authType === 'oauth',
    oauthIssuerUrl: server.oauthIssuerUrl,
    oauthAuthorizationUrl: server.oauthAuthorizationUrl,
    oauthTokenUrl: server.oauthTokenUrl,
    oauthScopes: server.oauthScopes,
    oauthClientId: server.oauthClientId,
    oauthError: server.oauthError,
    oauthConnectedAt: server.oauthConnectedAt,
    lastTestedAt: server.lastTestedAt,
    lastError: server.lastError,
    createdAt: server.createdAt,
    updatedAt: server.updatedAt,
  };
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

    const nextAuthType: McpAuthType = (input.authType ?? existing.authType) as McpAuthType;
    validateMcpOAuthConfig({
      authType: nextAuthType,
      oauthIssuerUrl: input.oauthIssuerUrl ?? existing.oauthIssuerUrl ?? undefined,
      oauthAuthorizationUrl: input.oauthAuthorizationUrl ?? existing.oauthAuthorizationUrl ?? undefined,
      oauthTokenUrl: input.oauthTokenUrl ?? existing.oauthTokenUrl ?? undefined,
      oauthClientId: input.oauthClientId ?? existing.oauthClientId ?? undefined,
    });

    let encryptedCredentials = existing.encryptedCredentials;
    let oauthAccessTokenEncrypted = existing.oauthAccessTokenEncrypted;
    let oauthRefreshTokenEncrypted = existing.oauthRefreshTokenEncrypted;
    let oauthAccessTokenExpiresAt = existing.oauthAccessTokenExpiresAt;
    let oauthConnectedAt = existing.oauthConnectedAt;
    let oauthError = existing.oauthError;

    // Clear credentials when switching auth type or when explicitly requested
    if (input.clearCredentials === true || nextAuthType === 'none' || nextAuthType === 'oauth') {
      encryptedCredentials = null;
    } else if (
      (nextAuthType === 'bearer' && input.bearerToken) ||
      (nextAuthType === 'header' && input.headerName && input.headerValue)
    ) {
      encryptedCredentials = getEncryptedMcpCredentials({
        name: input.name ?? existing.name,
        transportType: (input.transportType ?? existing.transportType) as McpTransportType,
        url: input.url ?? existing.url,
        authType: nextAuthType,
        bearerToken: input.bearerToken,
        headerName: input.headerName,
        headerValue: input.headerValue,
      });
    }

    // Handle OAuth token clearing
    if (nextAuthType !== 'oauth') {
      oauthAccessTokenEncrypted = null;
      oauthRefreshTokenEncrypted = null;
      oauthAccessTokenExpiresAt = null;
      oauthConnectedAt = null;
      oauthError = null;
    } else {
      if (input.clearOAuthTokens === true) {
        oauthAccessTokenEncrypted = null;
        oauthRefreshTokenEncrypted = null;
        oauthAccessTokenExpiresAt = null;
        oauthConnectedAt = null;
      }
      if (input.oauthClientSecret !== undefined) {
        oauthError = null;
      }
    }

    const updated = await prisma.mcpUserServer.update({
      where: { id, userId: user.id },
      data: {
        ...(input.name !== undefined && { name: input.name.trim() }),
        ...(input.transportType !== undefined && { transportType: input.transportType }),
        ...(input.url !== undefined && { url: input.url.trim() }),
        ...(input.authType !== undefined && { authType: input.authType }),
        ...(input.isEnabled !== undefined && { isEnabled: input.isEnabled }),
        ...(input.disabledTools !== undefined && { disabledTools: input.disabledTools }),
        ...(encryptedCredentials !== existing.encryptedCredentials && { encryptedCredentials }),
        oauthIssuerUrl: input.oauthIssuerUrl === undefined
          ? undefined
          : (input.oauthIssuerUrl?.trim() || null),
        oauthAuthorizationUrl: input.oauthAuthorizationUrl === undefined
          ? undefined
          : (input.oauthAuthorizationUrl?.trim() || null),
        oauthTokenUrl: input.oauthTokenUrl === undefined
          ? undefined
          : (input.oauthTokenUrl?.trim() || null),
        oauthScopes: input.oauthScopes === undefined
          ? undefined
          : normalizeMcpScopes(input.oauthScopes),
        oauthClientId: input.oauthClientId === undefined
          ? undefined
          : (input.oauthClientId.trim() || null),
        oauthClientSecretEncrypted: input.oauthClientSecret === undefined
          ? undefined
          : getEncryptedOAuthValue(input.oauthClientSecret),
        ...(oauthAccessTokenEncrypted !== existing.oauthAccessTokenEncrypted && { oauthAccessTokenEncrypted }),
        ...(oauthRefreshTokenEncrypted !== existing.oauthRefreshTokenEncrypted && { oauthRefreshTokenEncrypted }),
        ...(oauthAccessTokenExpiresAt !== existing.oauthAccessTokenExpiresAt && { oauthAccessTokenExpiresAt }),
        ...(oauthConnectedAt !== existing.oauthConnectedAt && { oauthConnectedAt }),
        ...(oauthError !== existing.oauthError && { oauthError }),
      },
    });

    return Response.json({ server: serializeMcpServer(updated) });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to update MCP server:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Invalid request' }, { status: 400 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
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
      where: { id, userId: user.id },
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
