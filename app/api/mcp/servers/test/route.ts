import { NextResponse } from 'next/server';
import { getOrCreateUser, AccountDeactivatedError } from '@/lib/auth';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { validateMcpServerUrl } from '@/lib/mcp/server-config';
import { getMcpAuthHeaders } from '@/lib/mcp/auth-headers';
import { logger } from '@/lib/logger';
import { checkApiRateLimit, rateLimitResponse } from '@/lib/rate-limit';

function isProUser(planTier: string | null | undefined) {
  return planTier === 'PRO' || planTier === 'ENTERPRISE' || planTier === 'BASIC';
}

const testMcpServerSchema = z.object({
  serverId: z.string().optional(),
  transportType: z.enum(['http', 'sse']).optional(),
  url: z.string().url().optional(),
  authType: z.enum(['none', 'bearer', 'header', 'oauth']).optional(),
  bearerToken: z.string().optional(),
  headerName: z.string().optional(),
  headerValue: z.string().optional(),
}).refine(
  (value) => Boolean(value.serverId) || (Boolean(value.transportType) && Boolean(value.url)),
  'Provide serverId or transportType/url',
);

export async function POST(request: Request) {
  try {
    // Rate limiting
    const rateLimit = await checkApiRateLimit(request);
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    const user = await getOrCreateUser(request);

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { planTier: true },
    });

    if (!dbUser || !isProUser(dbUser.planTier)) {
      return NextResponse.json({ error: 'Pro subscription required' }, { status: 403 });
    }

    const input = testMcpServerSchema.parse(await request.json());

    let serverConfig: {
      transportType: 'http' | 'sse';
      url: string;
      headers: Record<string, string>;
    };

    if (input.serverId) {
      const stored = await prisma.mcpUserServer.findFirst({
        where: { id: input.serverId, userId: user.id },
      });

      if (!stored) {
        return NextResponse.json({ error: 'MCP server not found' }, { status: 404 });
      }

      serverConfig = {
        transportType: stored.transportType as 'http' | 'sse',
        url: stored.url,
        headers: await getMcpAuthHeaders({
          id: stored.id,
          authType: stored.authType as 'none' | 'bearer' | 'header' | 'oauth',
          encryptedCredentials: stored.encryptedCredentials,
          oauthAccessTokenEncrypted: stored.oauthAccessTokenEncrypted,
          oauthRefreshTokenEncrypted: stored.oauthRefreshTokenEncrypted,
          oauthAccessTokenExpiresAt: stored.oauthAccessTokenExpiresAt,
          oauthIssuerUrl: stored.oauthIssuerUrl,
          oauthTokenUrl: stored.oauthTokenUrl,
          oauthClientId: stored.oauthClientId,
          oauthClientSecretEncrypted: stored.oauthClientSecretEncrypted,
        }, user.id),
      };
    } else {
      validateMcpServerUrl(input.url!);
      const headers: Record<string, string> = {};

      if (input.authType === 'bearer' && input.bearerToken) {
        headers.Authorization = `Bearer ${input.bearerToken}`;
      } else if (input.authType === 'header' && input.headerName && input.headerValue) {
        headers[input.headerName] = input.headerValue;
      }

      serverConfig = {
        transportType: input.transportType!,
        url: input.url!,
        headers,
      };
    }

    validateMcpServerUrl(serverConfig.url);

    // Use @ai-sdk/mcp to test connection
    const { createMCPClient } = await import('@ai-sdk/mcp');

    const client = await createMCPClient({
      transport: {
        type: serverConfig.transportType,
        url: serverConfig.url,
        headers: serverConfig.headers,
      },
    });

    try {
      const tools = await client.tools();
      const toolNames = Object.keys(tools);

      // Update last tested info if testing stored server
      if (input.serverId) {
        await prisma.mcpUserServer.update({
          where: { id: input.serverId, userId: user.id },
          data: {
            lastTestedAt: new Date(),
            lastError: null,
          },
        });
      }

      return Response.json({
        ok: true,
        toolCount: toolNames.length,
        toolNames: toolNames.slice(0, 20),
      });
    } finally {
      await client.close();
    }
  } catch (error) {
    if (error instanceof AccountDeactivatedError) {
      return NextResponse.json({ error: "Account deactivated" }, { status: 403 });
    }
    const rawMessage = error instanceof Error ? error.message : 'Connection test failed';

    // Update server error if testing stored server
    if (error instanceof Error) {
      logger.error("[MCPServers] Failed to test MCP server", error);
    }

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ error: rawMessage }, { status: 400 });
  }
}
