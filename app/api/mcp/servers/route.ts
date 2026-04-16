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
} from '@/lib/mcp/server-config';

const optionalUrlField = z.preprocess(
  (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
  z.string().trim().url().optional(),
);

const createMcpServerSchema = z.object({
  name: z.string().trim().min(1).max(80),
  transportType: z.enum(['http', 'sse']),
  url: z.string().trim().url(),
  authType: z.enum(['none', 'bearer', 'header', 'oauth']),
  bearerToken: z.string().optional(),
  headerName: z.string().optional(),
  headerValue: z.string().optional(),
  oauthIssuerUrl: optionalUrlField,
  oauthAuthorizationUrl: optionalUrlField,
  oauthTokenUrl: optionalUrlField,
  oauthScopes: z.string().optional(),
  oauthClientId: z.string().optional(),
  oauthClientSecret: z.string().optional(),
  isEnabled: z.boolean().optional(),
});

function isProUser(planTier: string | null | undefined) {
  // Allow all logged-in users for now (development mode)
  // TODO: Re-enable subscription check when ready
  return true;
  // return planTier === 'PRO' || planTier === 'ENTERPRISE' || planTier === 'BASIC';
}

function serializeMcpServer(server: {
  id: string;
  name: string;
  transportType: string;
  url: string;
  authType: string;
  isEnabled: boolean;
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

export async function GET(request: Request) {
  try {
    const user = await getOrCreateUser(request);

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { planTier: true },
    });

    if (!dbUser || !isProUser(dbUser.planTier)) {
      return NextResponse.json({ error: 'Pro subscription required' }, { status: 403 });
    }

    const servers = await prisma.mcpUserServer.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return Response.json({ servers: servers.map(serializeMcpServer) });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to list MCP servers:', error);
    return NextResponse.json({ error: 'Failed to list MCP servers' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getOrCreateUser(request);

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { planTier: true },
    });

    if (!dbUser || !isProUser(dbUser.planTier)) {
      return NextResponse.json({ error: 'Pro subscription required' }, { status: 403 });
    }

    const input = createMcpServerSchema.parse(await request.json());
    validateMcpServerUrl(input.url);
    validateMcpOAuthConfig(input);

    const created = await prisma.mcpUserServer.create({
      data: {
        userId: user.id,
        name: input.name,
        transportType: input.transportType,
        url: input.url,
        authType: input.authType,
        encryptedCredentials: getEncryptedMcpCredentials(input),
        oauthIssuerUrl: input.oauthIssuerUrl?.trim() || null,
        oauthAuthorizationUrl: input.oauthAuthorizationUrl?.trim() || null,
        oauthTokenUrl: input.oauthTokenUrl?.trim() || null,
        oauthScopes: normalizeMcpScopes(input.oauthScopes),
        oauthClientId: input.oauthClientId?.trim() || null,
        oauthClientSecretEncrypted: getEncryptedOAuthValue(input.oauthClientSecret),
        oauthAccessTokenEncrypted: null,
        oauthRefreshTokenEncrypted: null,
        oauthAccessTokenExpiresAt: null,
        oauthConnectedAt: null,
        oauthError: null,
        isEnabled: input.isEnabled ?? true,
      },
    });

    return Response.json({ server: serializeMcpServer(created) });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to create MCP server:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Invalid request' }, { status: 400 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create MCP server' }, { status: 500 });
  }
}
