import 'server-only';

import { createMCPClient } from '@ai-sdk/mcp';
import { getMcpAuthHeaders } from '@/lib/mcp/auth-headers';
import prisma from '@/lib/prisma';

export interface MCPTool {
  name: string;           // prefixed: "srv_abc:github_pullRequests"
  serverId: string;       // for routing
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, { type: string; description?: string }>;
    required?: string[];
  };
}

interface MCPToolDefinition {
  name?: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  [key: string]: unknown;
}

function toSafeSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24) || 'server';
}

const MCP_TOOL_LOAD_TIMEOUT_MS = 20000;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Load user's enabled MCP servers with auth headers
 */
export async function getEnabledMCPServers(userId: string): Promise<Array<{
  server: {
    id: string;
    name: string;
    transportType: string;
    url: string;
    authType: string;
    encryptedCredentials: string | null;
    oauthAccessTokenEncrypted: string | null;
    oauthRefreshTokenEncrypted: string | null;
    oauthAccessTokenExpiresAt: Date | null;
    oauthIssuerUrl: string | null;
    oauthTokenUrl: string | null;
    oauthClientId: string | null;
    oauthClientSecretEncrypted: string | null;
    oauthScopes: string | null;
    disabledTools: string[];
  };
  authHeaders: Record<string, string>;
}>> {
  const servers = await prisma.mcpUserServer.findMany({
    where: { userId, isEnabled: true },
    select: {
      id: true,
      name: true,
      transportType: true,
      url: true,
      authType: true,
      encryptedCredentials: true,
      oauthAccessTokenEncrypted: true,
      oauthRefreshTokenEncrypted: true,
      oauthAccessTokenExpiresAt: true,
      oauthIssuerUrl: true,
      oauthTokenUrl: true,
      oauthClientId: true,
      oauthClientSecretEncrypted: true,
      oauthScopes: true,
      disabledTools: true,
    },
  });

  const serversWithAuth = await Promise.all(
    servers.map(async (server) => {
      const authHeaders = await getMcpAuthHeaders(server as Parameters<typeof getMcpAuthHeaders>[0], userId);
      return { server, authHeaders };
    })
  );

  return serversWithAuth;
}

/**
 * Fetch tools from all enabled MCP servers, merged into unified list
 */
export async function getMCPToolsForChat(userId: string): Promise<MCPTool[]> {
  const serversWithAuth = await getEnabledMCPServers(userId);
  if (serversWithAuth.length === 0) return [];

  const tools: MCPTool[] = [];
  const errors: string[] = [];

  await Promise.all(
    serversWithAuth.map(async ({ server, authHeaders }) => {
      try {
        const client = await withTimeout(
          createMCPClient({
            transport: {
              type: server.transportType as 'http' | 'sse',
              url: server.url,
              headers: authHeaders,
            },
          }),
          MCP_TOOL_LOAD_TIMEOUT_MS,
          `MCP tool loading timed out for ${server.name} after ${MCP_TOOL_LOAD_TIMEOUT_MS}ms`,
        );

        try {
          const serverTools = await client.tools();
          const slug = toSafeSlug(server.name);
          const disabledForServer: string[] = Array.isArray(server.disabledTools) ? server.disabledTools : [];

          for (const [toolName, toolDef] of Object.entries(serverTools)) {
            // Skip tools the user has disabled for this server
            if (disabledForServer.includes(toolName)) continue;

            const prefixedName = `mcp_${slug}_${toolName}`;
            const def = toolDef as MCPToolDefinition;

            tools.push({
              name: prefixedName,
              serverId: server.id,
              description: def.description || `Tool from ${server.name}`,
              inputSchema: (def.inputSchema as MCPTool['inputSchema']) || { type: 'object', properties: {} },
            });
          }
        } finally {
          await client.close();
        }
      } catch (error) {
        errors.push(`${server.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    })
  );

  if (errors.length > 0) {
    console.warn('[MCP] Some servers failed:', errors);
  }

  return tools;
}

/**
 * Format tools for OpenAI API (OpenAI-compatible tool format)
 * OpenAI supports OpenAI-compatible tools in chat completions
 */
export function formatMCPToolsForOpenAI(tools: MCPTool[]): Array<{
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, { type: string; description?: string }>;
      required?: string[];
    };
  };
}> {
  return tools
    .filter((tool) => {
      // Filter out tools with invalid schemas
      const schema = tool.inputSchema;
      if (!schema) return false;
      const schemaType = String(schema.type);
      // Must be object type
      if (schemaType !== 'object') return false;
      // Properties must be an object if present
      if (schema.properties && typeof schema.properties !== 'object') return false;
      return true;
    })
    .map((tool) => {
      const schema = tool.inputSchema;
      // Ensure properties is a proper object
      const safeSchema = {
        type: 'object' as const,
        properties: (schema.properties && typeof schema.properties === 'object') ? schema.properties : {},
        required: Array.isArray(schema.required) ? schema.required : undefined,
      };
      return {
        type: 'function' as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters: safeSchema,
        },
      };
    });
}
