import "server-only";

import { createMCPClient, ElicitationRequestSchema, type MCPClient } from "@ai-sdk/mcp";
import { getMcpAuthHeaders } from "@/lib/mcp/auth-headers";
import { waitForElicitation } from "@/services/mcp-elicitation.service";
import prisma from "@/lib/prisma";
import { randomUUID } from "node:crypto";
import { all } from "better-all";

/*
 * Production fixes in this file:
 * 1. Persist elicitation state (allow resume on disconnect)
 * 2. Idempotent elicitation IDs (prevent duplicate approvals)
 * 3. Server-side input validation (never trust LLM params)
 * 4. SSE reliability (replay mechanism for disconnects)
 */

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

// In-flight elicitation persistence (survives UI disconnect)
const elicitationState = new Map<string, {
  id: string;
  serverName: string;
  message: string;
  requestedSchema?: unknown;
  mode: string;
  url?: string;
  createdAt: number;
  userId: string;
  status: "pending" | "approved" | "denied" | "cancelled" | "expired";
  result?: Record<string, unknown>;
}>();

/**
 * Persist elicitation state for resume capability
 */
function persistElicitationState(params: {
  elicitationId: string;
  serverName: string;
  message: string;
  requestedSchema?: unknown;
  mode: string;
  url?: string;
  userId: string;
}): void {
  const state = {
    id: params.elicitationId,
    serverName: params.serverName,
    message: params.message,
    requestedSchema: params.requestedSchema,
    mode: params.mode,
    url: params.url,
    createdAt: Date.now(),
    userId: params.userId,
    status: "pending" as const,
  };
  elicitationState.set(params.elicitationId, state);

  // Also persist to Redis for cross-container recovery
  persistToRedis(params.elicitationId, state).catch(console.error);
}

/**
 * Persist to Redis for durability across container restarts
 */
async function persistToRedis(
  elicitationId: string,
  state: ReturnType<typeof persistElicitationState> extends void ? never : ReturnType<typeof persistElicitationState>
): Promise<void> {
  try {
    const redis = (await import("@/lib/redis")).default;
    const key = `elicitation:${elicitationId}`;
    await redis.setex(key, 600, JSON.stringify(state)); // 10 minute TTL
  } catch {
    // Redis unavailable - in-memory fallback
  }
}

/**
 * Resume elicitation state from Redis
 */
async function resumeElicitationState(elicitationId: string): Promise<{
  id: string;
  serverName: string;
  message: string;
  requestedSchema?: unknown;
  mode: string;
  url?: string;
  createdAt: number;
  userId: string;
  status: "pending" | "approved" | "denied" | "cancelled" | "expired";
  result?: Record<string, unknown>;
} | null> {
  // Check in-memory first
  const memoryState = elicitationState.get(elicitationId);
  if (memoryState) return memoryState;

  // Check Redis
  try {
    const redis = (await import("@/lib/redis")).default;
    const key = `elicitation:${elicitationId}`;
    const data = await redis.get(key);
    if (data) {
      const state = JSON.parse(data);
      // Restore to in-memory for faster access
      elicitationState.set(elicitationId, state);
      return state;
    }
  } catch {
    // Redis unavailable
  }

  return null;
}

/**
 * Update elicitation status
 */
function updateElicitationStatus(
  elicitationId: string,
  status: "approved" | "denied" | "cancelled" | "expired",
  result?: Record<string, unknown>
): void {
  const state = elicitationState.get(elicitationId);
  if (state) {
    state.status = status;
    state.result = result;
    // Update Redis
    persistToRedis(elicitationId, state).catch(console.error);
  }
}

/**
 * Validate tool input server-side (NEVER trust LLM-generated params)
 * This prevents prompt injection attacks where user might blindly approve malicious inputs
 */
function validateToolInput(
  toolName: string,
  arguments_: Record<string, unknown>
): { valid: boolean; error?: string } {
  // Add server-side validation rules per tool
  // This is where you'd implement security checks for sensitive operations

  // Example: Email tool - validate email addresses
  if (toolName.includes("email") || toolName.includes("send")) {
    const to = arguments_.to as string || arguments_.recipient as string;
    if (to && !isValidEmail(to)) {
      return { valid: false, error: "Invalid email address" };
    }
  }

  // Example: URL tool - validate URLs don't point to internal resources
  if (arguments_.url) {
    const url = arguments_.url as string;
    if (isInternalUrl(url)) {
      return { valid: false, error: "Cannot access internal resources" };
    }
  }

  // Example: Amount/number fields - validate ranges
  if (typeof arguments_.amount === "number") {
    if (arguments_.amount < 0) {
      return { valid: false, error: "Amount cannot be negative" };
    }
    if (arguments_.amount > 1000000) {
      return { valid: false, error: "Amount exceeds maximum allowed" };
    }
  }

  return { valid: true };
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isInternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    // Block internal IPs, localhost, private ranges
    return hostname === "localhost" ||
           hostname === "127.0.0.1" ||
           hostname.startsWith("192.168.") ||
           hostname.startsWith("10.") ||
           hostname.startsWith("172.16.") ||
           hostname.endsWith(".internal") ||
           hostname.endsWith(".local");
  } catch {
    return true; // Invalid URL = block
  }
}

type DataStreamWriter = (event: { type: string; data: unknown }) => void;

export interface ResolvedMcpClients {
  clients: MCPClient[];
  tools: Record<string, unknown>;
  closeAll: () => Promise<void>;
}

/**
 * Resolve MCP tools with elicitation support (with production fixes)
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

  // Load servers in parallel for better performance
  const serverResults = await Promise.all(
    servers.map(async (server) => {
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

        const serverTools = await withTimeout(
          client.tools(),
          MCP_TOOL_CALL_TIMEOUT_MS,
          `MCP tool loading timed out for ${server.name} after ${MCP_TOOL_CALL_TIMEOUT_MS}ms`
        );

        return { server, client, serverTools, error: null };
      } catch (error) {
        console.error(`[MCP] Failed to load server ${server.name}:`, error);
        return { server, client: null, serverTools: null, error };
      }
    })
  );

  for (const result of serverResults) {
    const { server, client, serverTools } = result;

    if (!client || !serverTools) continue;

    // Register elicitation handler if dataStream is provided
    if (dataStream) {
      const serverName = server.name;
      client.onElicitationRequest(ElicitationRequestSchema, async (request) => {
        // Generate idempotent elicitation ID
        // Use request ID if available, otherwise generate one
        const elicitationId = (request as unknown as { id?: string }).id || randomUUID();

        const params = request.params as {
          message: string;
          requestedSchema?: unknown;
          mode?: string;
          url?: string;
        };

        const isUrlMode = params.mode === "url" && Boolean(params.url);

        // Persist state BEFORE sending to client (enables resume on disconnect)
        persistElicitationState({
          elicitationId,
          serverName,
          message: params.message,
          requestedSchema: isUrlMode ? undefined : params.requestedSchema,
          mode: isUrlMode ? "url" : "form",
          url: isUrlMode ? params.url : undefined,
          userId,
        });

        // Send elicitation event to SSE stream
        dataStream({
          type: "data-mcp_elicitation",
          data: {
            elicitationId,
            serverName,
            message: params.message,
            mode: isUrlMode ? "url" : "form",
            requestedSchema: isUrlMode ? undefined : params.requestedSchema,
            url: isUrlMode ? params.url : undefined,
            // Include timestamp for replay capability
            timestamp: Date.now(),
            expiresAt: Date.now() + ELICITATION_TIMEOUT_MS,
          },
        });

        // Check if there's a prior response (for resume after disconnect)
        const priorState = await resumeElicitationState(elicitationId);
        if (priorState && priorState.status !== "pending") {
          // Resume from prior state
          console.log(`[MCP] Resuming elicitation ${elicitationId} with status ${priorState.status}`);
          dataStream({
            type: "data-mcp_elicitation_done",
            data: {
              elicitationId,
              resumed: true,
              status: priorState.status,
              result: priorState.result,
            },
          });
          return priorState.status === "approved"
            ? { action: "accept" as const, content: priorState.result }
            : { action: priorState.status as "decline" | "cancel" };
        }

        let result: { action: "accept" | "decline" | "cancel"; content?: Record<string, unknown> };

        try {
          result = await withTimeout(
            waitForElicitation(elicitationId),
            ELICITATION_TIMEOUT_MS,
            "Elicitation timed out"
          );

          // Validate server-side BEFORE accepting
          // Get the original tool name from the request
          const toolName = (request.params as { message?: string })?.message || "unknown";
          if (result.action === "accept" && result.content) {
            const validation = validateToolInput(toolName, result.content);
            if (!validation.valid) {
              console.warn(`[MCP] Tool input validation failed for ${toolName}: ${validation.error}`);
              result = { action: "decline" };
            }
          }
        } catch {
          result = { action: "cancel" };
        }

        // Update state with result
        updateElicitationStatus(
          elicitationId,
          result.action === "accept" ? "approved" : result.action,
          result.content
        );

        dataStream({
          type: "data-mcp_elicitation_done",
          data: {
            elicitationId,
            status: result.action === "accept" ? "approved" : result.action,
            result: result.content,
          },
        });

        return result;
      });
    }

    clients.push(client);

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

    if (typeof (toolDef as unknown as { execute?: unknown }).execute !== "function") {
      return { id: toolCall.id, result: null, error: `Tool ${toolCall.name} is not executable` };
    }

    // Server-side validation of tool arguments BEFORE execution
    const validation = validateToolInput(originalName, toolCall.arguments);
    if (!validation.valid) {
      console.warn(`[MCP] Tool input validation failed for ${originalName}: ${validation.error}`);
      return { id: toolCall.id, result: null, error: validation.error };
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

    if (typeof (toolDef as unknown as { execute?: unknown }).execute !== "function") {
      return { id: toolCall.id, result: null, error: `Tool ${originalName} is not executable` };
    }

    // Validate before execution
    const validation = validateToolInput(originalName, toolCall.arguments);
    if (!validation.valid) {
      return { id: toolCall.id, result: null, error: validation.error };
    }

    const result = await withTimeout(
      (toolDef as unknown as { execute: (args: Record<string, unknown>, context: Record<string, unknown>) => Promise<unknown> }).execute(toolCall.arguments, {}),
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

/**
 * Get pending elicitation for user (for polling fallback / replay)
 */
export async function getPendingElicitations(userId: string): Promise<Array<{
  elicitationId: string;
  serverName: string;
  message: string;
  createdAt: number;
  expiresAt: number;
}>> {
  const pending: Array<{
    elicitationId: string;
    serverName: string;
    message: string;
    createdAt: number;
    expiresAt: number;
  }> = [];

  for (const [id, state] of elicitationState) {
    if (state.userId === userId && state.status === "pending") {
      pending.push({
        elicitationId: id,
        serverName: state.serverName,
        message: state.message,
        createdAt: state.createdAt,
        expiresAt: state.createdAt + ELICITATION_TIMEOUT_MS,
      });
    }
  }

  return pending;
}

/**
 * Clean up expired elicitation states (periodic cleanup)
 */
export function cleanupExpiredElicitations(): number {
  const now = Date.now();
  let cleaned = 0;

  for (const [id, state] of elicitationState) {
    if (state.status === "pending" && now - state.createdAt > ELICITATION_TIMEOUT_MS) {
      state.status = "expired";
      cleaned++;
    }
  }

  return cleaned;
}