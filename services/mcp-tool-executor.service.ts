import 'server-only';

import { createMCPClient } from '@ai-sdk/mcp';
import { getMcpAuthHeaders } from '@/lib/mcp/auth-headers';
import prisma from '@/lib/prisma';

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  id: string;
  result: unknown;
  error?: string;
}

function parsePrefixedToolName(prefixedName: string): { serverId: string; originalName: string } | null {
  // Format: mcp_{slug}_{originalName}
  const match = prefixedName.match(/^mcp_(.+?)_(.+)$/);
  if (!match) return null;
  return { serverId: match[1], originalName: match[2] };
}

const MCP_TOOL_CALL_TIMEOUT_MS = 30000;

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
 * Execute a tool call on the appropriate MCP server
 */
export async function executeMCPToolCall(
  toolCall: ToolCall,
  userId: string
): Promise<ToolResult> {
  const parsed = parsePrefixedToolName(toolCall.name);
  if (!parsed) {
    return { id: toolCall.id, result: null, error: `Invalid tool name format: ${toolCall.name}` };
  }

  const { serverId, originalName } = parsed;

  // Fetch server from DB
  const server = await prisma.mcpUserServer.findFirst({
    where: { id: serverId, userId },
  });

  if (!server) {
    return { id: toolCall.id, result: null, error: `Server not found: ${serverId}` };
  }

  // Get auth headers
  const authHeaders = await getMcpAuthHeaders(
    {
      authType: server.authType as 'none' | 'bearer' | 'header' | 'oauth',
      encryptedCredentials: server.encryptedCredentials,
      oauthAccessTokenEncrypted: server.oauthAccessTokenEncrypted,
      oauthRefreshTokenEncrypted: server.oauthRefreshTokenEncrypted,
      oauthAccessTokenExpiresAt: server.oauthAccessTokenExpiresAt,
      oauthIssuerUrl: server.oauthIssuerUrl,
    },
    userId
  );

  // Create MCP client and get tools
  const client = await createMCPClient({
    transport: {
      type: server.transportType as 'http' | 'sse',
      url: server.url,
      headers: authHeaders,
    },
  });

  try {
    // Get the tool with its execute function
    const tools = await withTimeout(
      client.tools(),
      MCP_TOOL_CALL_TIMEOUT_MS,
      `Tool load timed out after ${MCP_TOOL_CALL_TIMEOUT_MS}ms`
    );

    const toolDef = tools[originalName];
    if (!toolDef) {
      return { id: toolCall.id, result: null, error: `Tool not found: ${originalName}` };
    }

    // Check if tool has execute function
    if (typeof (toolDef as any).execute !== 'function') {
      return { id: toolCall.id, result: null, error: `Tool ${originalName} is not executable` };
    }

    // Execute the tool with timeout
    const result = await withTimeout(
      (toolDef as any).execute(toolCall.arguments, {}),
      MCP_TOOL_CALL_TIMEOUT_MS,
      `Tool call timed out after ${MCP_TOOL_CALL_TIMEOUT_MS}ms`
    );

    return { id: toolCall.id, result };
  } catch (error) {
    return {
      id: toolCall.id,
      result: null,
      error: error instanceof Error ? error.message : 'Tool execution failed',
    };
  } finally {
    await client.close();
  }
}

/**
 * Execute multiple tool calls in parallel
 */
export async function executeMCPToolCalls(
  toolCalls: ToolCall[],
  userId: string
): Promise<ToolResult[]> {
  const results = await Promise.all(
    toolCalls.map((toolCall) => executeMCPToolCall(toolCall, userId))
  );
  return results;
}
