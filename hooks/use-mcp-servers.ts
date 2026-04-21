/**
 * MCP Servers React Query Hooks
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CatalogItem, ServerItem } from "@/components/apps";
import {
  getTransportType,
  AUTH_TO_API_AUTH,
  CatalogAuth,
} from "@/components/apps/catalog-data";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CatalogResponse {
  items: CatalogItem[];
}

interface ServersResponse {
  servers: ServerItem[];
}

interface AddServerBody {
  name: string;
  url: string;
  isEnabled: boolean;
  transportType: "sse" | "http";
  authType: "oauth" | "header" | "none";
}

interface AddServerResponse {
  server: ServerItem;
}

interface OAuthStartResponse {
  authorizationUrl?: string;
  error?: string;
}

interface TestServerResponse {
  toolCount: number;
  error?: string;
}

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * Fetch catalog items from the API
 */
export function useCatalog() {
  return useQuery({
    queryKey: ["mcp-catalog"],
    queryFn: async (): Promise<CatalogItem[]> => {
      const res = await fetch("/api/mcp/catalog");
      if (!res.ok) throw new Error("Failed to fetch catalog");
      const data: CatalogResponse = await res.json();
      return data.items ?? [];
    },
    staleTime: 5 * 60_000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetch user's MCP servers
 */
export function useServers(userId: string | undefined) {
  return useQuery({
    queryKey: ["mcp-servers", userId],
    queryFn: async (): Promise<ServerItem[]> => {
      const res = await fetch("/api/mcp/servers");
      if (!res.ok) throw new Error("Failed to fetch servers");
      const data: ServersResponse = await res.json();
      return data.servers ?? [];
    },
    enabled: !!userId,
    staleTime: 5 * 60_000, // 5 minutes - reduce frequent hits
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Don't refetch on mount if fresh data exists
  });

}
// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Add a new MCP server from catalog
 */
export function useAddServer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: CatalogItem): Promise<AddServerResponse> => {
      const body: AddServerBody = {
        name: item.name,
        url: item.url,
        isEnabled: true,
        transportType: getTransportType(item.url),
        authType:
          AUTH_TO_API_AUTH[item.auth as CatalogAuth] ?? "none",
      };
      const res = await fetch("/api/mcp/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed to add server" }));
        throw new Error(data.error || "Failed to add server");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mcp-servers"] });
    },
  });
}

/**
 * Delete an MCP server
 */
export function useDeleteServer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const res = await fetch(`/api/mcp/servers/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed to delete server" }));
        throw new Error(data.error || "Failed to delete server");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mcp-servers"] });
    },
  });
}

/**
 * Toggle an MCP server enabled/disabled
 */
export function useToggleServer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isEnabled }: { id: string; isEnabled: boolean }): Promise<ServerItem> => {
      const res = await fetch(`/api/mcp/servers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed to toggle server" }));
        throw new Error(data.error || "Failed to toggle server");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mcp-servers"] });
    },
  });
}

/**
 * Test connection to an MCP server
 */
export function useTestServer() {
  return useMutation({
    mutationFn: async (id: string): Promise<TestServerResponse> => {
      const res = await fetch("/api/mcp/servers/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serverId: id }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Connection test failed");
      }
      return data;
    },
  });
}

/**
 * Start OAuth flow for an MCP server
 */
export function useOAuthStart() {
  return useMutation({
    mutationFn: async (id: string): Promise<OAuthStartResponse> => {
      const res = await fetch(`/api/mcp/servers/${id}/oauth/start`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to start OAuth");
      }
      return data;
    },
  });
}

/**
 * Disconnect OAuth from an MCP server
 */
export function useOAuthDisconnect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const res = await fetch(`/api/mcp/servers/${id}/oauth/disconnect`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed to disconnect OAuth" }));
        throw new Error(data.error || "Failed to disconnect OAuth");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mcp-servers"] });
    },
  });
}

interface ToolInfo {
  name: string;
  title: string | null;
  description: string | null;
}

/**
 * Fetch tools from an MCP server
 */
export function useFetchServerTools() {
  return useMutation({
    mutationFn: async (serverId: string): Promise<ToolInfo[]> => {
      const res = await fetch(`/api/mcp/servers/${serverId}/tools`);
      const data = await res.json() as { ok?: boolean; tools?: ToolInfo[]; error?: string };
      if (!res.ok || !data.ok || !data.tools) {
        throw new Error(data.error || "Failed to fetch tools");
      }
      return data.tools;
    },
  });
}

/**
 * Save disabled tools for an MCP server
 */
export function useSaveDisabledTools() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ serverId, disabledTools }: { serverId: string; disabledTools: string[] }): Promise<string[]> => {
      const res = await fetch(`/api/mcp/servers/${serverId}/tools`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disabledTools }),
      });
      const data = await res.json() as { ok?: boolean; disabledTools?: string[]; error?: string };
      if (!res.ok || !data.ok || data.disabledTools === undefined) {
        throw new Error(data.error || "Failed to save disabled tools");
      }
      return data.disabledTools;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mcp-servers"] });
    },
  });
}
