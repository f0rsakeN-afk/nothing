import "server-only";

import { createMCPClient, ElicitationRequestSchema, type MCPClient } from "@ai-sdk/mcp";
import { getMcpAuthHeaders } from "@/lib/mcp/auth-headers";
import { waitForElicitation } from "@/services/mcp-elicitation.service";
import prisma from "@/lib/prisma";
import { randomUUID } from "node:crypto";
import { all } from "better-all";

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

interface MCPToolDefinition {
  name?: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  [key: string]: unknown;
}

interface ToolDefinition {
  execute?: (args: Record<string, unknown>, context: Record<string, unknown>) => Promise<unknown>;
}

function toSafeSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24) || "server";
}

const MCP_TOOL_CALL_TIMEOUT_MS = 30000;
const ELICITATION_TIMEOUT_MS = 5 * 60 * 1000;

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
 * Write elicitation event to data stream
 */
type DataStreamWriter = (event: { type: string; data: unknown }) => void;

interface ResolvedMcpClients {
  clients: MCPClient[];
  tools: Record<string, unknown>;
  closeAll: () => Promise<void>;
}

/**
 * Resolve MCP tools with elicitation support
 */
export async function resolveMcpToolsWithElicitation({
  userId,
  dataStream,
}: {
  userId: string;
  dataStream?: DataStreamWriter;
}): Promise<ResolvedMcpClients> {
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

  const clients: MCPClient[] = [];
  const tools: Record<string, unknown> = {};

  for (const server of servers) {
    try {
      const authHeaders = await getMcpAuthHeaders(
        {
          id: server.id,
          authType: server.authType as "none" | "bearer" | "header" | "oauth",
          encryptedCredentials: server.encryptedCredentials,
          oauthAccessTokenEncrypted: server.oauthAccessTokenEncrypted,
          oauthRefreshTokenEncrypted: server.oauthRefreshTokenEncrypted,
          oauthAccessTokenExpiresAt: server.oauthAccessTokenExpiresAt,
          oauthIssuerUrl: server.oauthIssuerUrl,
          oauthTokenUrl: server.oauthTokenUrl,
          oauthClientId: server.oauthClientId,
          oauthClientSecretEncrypted: server.oauthClientSecretEncrypted,
        },
        userId
      );

      const client = await createMCPClient({
        transport: {
          type: server.transportType as "http" | "sse",
          url: server.url,
          headers: authHeaders,
        },
        capabilities: {
          elicitation: {},
        },
      });

      // Register elicitation handler if dataStream is provided
      if (dataStream) {
        const serverName = server.name;
        client.onElicitationRequest(ElicitationRequestSchema, async (request) => {
          const elicitationId = randomUUID();
          const params = request.params as {
            message: string;
            requestedSchema?: unknown;
            mode?: string;
            url?: string;
          };

          const isUrlMode = params.mode === "url" && Boolean(params.url);

          dataStream({
            type: "data-mcp_elicitation",
            data: {
              elicitationId,
              serverName,
              message: params.message,
              mode: isUrlMode ? "url" : "form",
              requestedSchema: isUrlMode ? undefined : params.requestedSchema,
              url: isUrlMode ? params.url : undefined,
            },
          });

          let result: { action: "accept" | "decline" | "cancel"; content?: Record<string, unknown> };
          try {
            result = await withTimeout(
              waitForElicitation(elicitationId),
              ELICITATION_TIMEOUT_MS,
              "Elicitation timed out"
            );
          } catch {
            result = { action: "cancel" };
          }

          dataStream({
            type: "data-mcp_elicitation_done",
            data: { elicitationId },
          });

          return result;
        });
      }

      clients.push(client);

      const serverTools = await withTimeout(
        client.tools(),
        MCP_TOOL_CALL_TIMEOUT_MS,
        `MCP tool loading timed out for ${server.name} after ${MCP_TOOL_CALL_TIMEOUT_MS}ms`
      );

      const slug = toSafeSlug(server.name);
      const disabledForServer: string[] = Array.isArray(server.disabledTools) ? server.disabledTools : [];

      for (const [toolName, toolDef] of Object.entries(serverTools)) {
        if (disabledForServer.includes(toolName)) continue;

        const baseName = `mcp_${slug}_${toolName}`;
        let uniqueName = baseName;
        let counter = 2;
        while (tools[uniqueName]) {
          uniqueName = `${baseName}_${counter}`;
          counter += 1;
        }

        tools[uniqueName] = toolDef;
      }
    } catch (error) {
      console.error(`[MCP] Failed to load server ${server.name}:`, error);
    }
  }

  async function closeAll() {
    await all(
      Object.fromEntries(clients.map((client, i) => [`client:${i}`, async () => {
        try { await client.close(); } catch { /* ignore close errors */ }
      }])),
    );
  }

  return { clients, tools, closeAll };
}

function parsePrefixedToolName(prefixedName: string): { serverSlug: string; originalName: string } | null {
  // Format: mcp_{slug}_{originalName}
  const match = prefixedName.match(/^mcp_(.+?)_(.+)$/);
  if (!match) return null;
  return { serverSlug: match[1], originalName: match[2] };
}

/**
 * Execute a tool call on the appropriate MCP server
 */
export async function executeMCPToolCall(
  toolCall: ToolCall,
  userId: string,
  mcpClients?: ResolvedMcpClients
): Promise<ToolResult> {
  const parsed = parsePrefixedToolName(toolCall.name);
  if (!parsed) {
    return { id: toolCall.id, result: null, error: `Invalid tool name format: ${toolCall.name}` };
  }

  const { originalName } = parsed;

  // If we have pre-resolved clients, use them
  if (mcpClients) {
    const toolDef = mcpClients.tools[toolCall.name];
    if (!toolDef) {
      return { id: toolCall.id, result: null, error: `Tool not found: ${toolCall.name}` };
    }

    if (typeof (toolDef as ToolDefinition).execute !== "function") {
      return { id: toolCall.id, result: null, error: `Tool ${toolCall.name} is not executable` };
    }

    try {
      const result = await withTimeout(
        (toolDef as ToolDefinition).execute!(toolCall.arguments, {}),
        MCP_TOOL_CALL_TIMEOUT_MS,
        `Tool call timed out after ${MCP_TOOL_CALL_TIMEOUT_MS}ms`
      );
      return { id: toolCall.id, result };
    } catch (error) {
      return {
        id: toolCall.id,
        result: null,
        error: error instanceof Error ? error.message : "Tool execution failed",
      };
    }
  }

  // Fallback to creating a new client (legacy behavior without elicitation)
  const server = await prisma.mcpUserServer.findFirst({
    where: { userId },
  });

  if (!server) {
    return { id: toolCall.id, result: null, error: `No MCP server found for user` };
  }

  const authHeaders = await getMcpAuthHeaders(
    {
      id: server.id,
      authType: server.authType as "none" | "bearer" | "header" | "oauth",
      encryptedCredentials: server.encryptedCredentials,
      oauthAccessTokenEncrypted: server.oauthAccessTokenEncrypted,
      oauthRefreshTokenEncrypted: server.oauthRefreshTokenEncrypted,
      oauthAccessTokenExpiresAt: server.oauthAccessTokenExpiresAt,
      oauthIssuerUrl: server.oauthIssuerUrl,
      oauthTokenUrl: server.oauthTokenUrl,
      oauthClientId: server.oauthClientId,
      oauthClientSecretEncrypted: server.oauthClientSecretEncrypted,
    },
    userId
  );

  const client = await createMCPClient({
    transport: {
      type: server.transportType as "http" | "sse",
      url: server.url,
      headers: authHeaders,
    },
  });

  try {
    const tools = await withTimeout(
      client.tools(),
      MCP_TOOL_CALL_TIMEOUT_MS,
      `Tool load timed out after ${MCP_TOOL_CALL_TIMEOUT_MS}ms`
    );

    const toolDef = tools[originalName];
    if (!toolDef) {
      return { id: toolCall.id, result: null, error: `Tool not found: ${originalName}` };
    }

    if (typeof (toolDef as ToolDefinition).execute !== "function") {
      return { id: toolCall.id, result: null, error: `Tool ${originalName} is not executable` };
    }

    const result = await withTimeout(
      (toolDef as ToolDefinition).execute!(toolCall.arguments, {}),
      MCP_TOOL_CALL_TIMEOUT_MS,
      `Tool call timed out after ${MCP_TOOL_CALL_TIMEOUT_MS}ms`
    );

    return { id: toolCall.id, result };
  } catch (error) {
    return {
      id: toolCall.id,
      result: null,
      error: error instanceof Error ? error.message : "Tool execution failed",
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
  userId: string,
  mcpClients?: ResolvedMcpClients
): Promise<ToolResult[]> {
  const results = await Promise.all(
    toolCalls.map((toolCall) => executeMCPToolCall(toolCall, userId, mcpClients))
  );
  return results;
}
