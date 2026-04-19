"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useUser } from "@stackframe/stack";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Loader2, Plus, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CatalogGrid,
  CatalogCard,
  ServerList,
  CATEGORIES,
  CatalogItem,
  CategoryId,
  ServerItem,
  ToolInfo,
  FEATURED_NAMES,
} from "@/components/apps";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  useCatalog,
  useServers,
  useAddServer,
  useDeleteServer,
  useToggleServer,
  useTestServer,
  useOAuthStart,
  useOAuthDisconnect,
  useFetchServerTools,
  useSaveDisabledTools,
} from "@/hooks/use-mcp-servers";
import { getTransportType } from "@/components/apps/catalog-data";
import { ServiceIcon } from "@/components/apps/service-icon";
import { getMcpCatalogIcon } from "@/lib/mcp/catalog-icons";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface CustomServerForm {
  name: string;
  url: string;
  authType: "none" | "bearer" | "header" | "oauth";
  bearerToken: string;
  headerName: string;
  headerValue: string;
}

interface EditServerForm {
  name: string;
  url: string;
  headerName: string;
  headerValue: string;
  bearerToken: string;
  oauthClientId: string;
}

// ─── Page Component ─────────────────────────────────────────────────────────────

export default function AppsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const user = useUser();

  // Tab state - synced with URL search params
  const activeTab = searchParams.get("tab") === "my-servers" ? "my-servers" : "browse";

  // Handle OAuth callback redirect
  useEffect(() => {
    const oauthStatus = searchParams.get("mcpOauth");
    const message = searchParams.get("message");
    if (!oauthStatus) return;
    if (oauthStatus === "success") {
      toast.success("App connected", { description: "OAuth authorization successful" });
    } else {
      toast.error("OAuth failed", { description: message ?? "Authorization was not completed" });
    }
    const clean = new URL(window.location.href);
    clean.searchParams.delete("mcpOauth");
    clean.searchParams.delete("message");
    window.history.replaceState({}, "", clean.toString());
  }, [searchParams]);

  const handleTabChange = useCallback((tab: "browse" | "my-servers") => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "my-servers") {
      params.set("tab", "my-servers");
    } else {
      params.delete("tab");
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [router, pathname, searchParams]);

  // Filter state
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CategoryId>("all");

  // UI state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [addingUrl, setAddingUrl] = useState<string | null>(null);

  // Active operation IDs
  const [testingId, setTestingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  // Tool management state
  const [expandedToolsId, setExpandedToolsId] = useState<string | null>(null);
  const [serverToolsCache, setServerToolsCache] = useState<Record<string, ToolInfo[]>>({});
  const [toolsLoading, setToolsLoading] = useState<Record<string, boolean>>({});

  // Custom server dialog
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [customForm, setCustomForm] = useState<CustomServerForm>({
    name: "",
    url: "",
    authType: "none",
    bearerToken: "",
    headerName: "",
    headerValue: "",
  });

  // API Key dialog
  const [apiKeyTarget, setApiKeyTarget] = useState<CatalogItem | null>(null);
  const [apiKeyValues, setApiKeyValues] = useState<Record<string, string>>({});

  // OAuth setup dialog
  const [oauthSetupTarget, setOauthSetupTarget] = useState<CatalogItem | null>(null);
  const [oauthSetupValues, setOauthSetupValues] = useState<Record<string, string>>({});

  // Edit server dialog
  const [editTarget, setEditTarget] = useState<ServerItem | null>(null);
  const [editForm, setEditForm] = useState<EditServerForm>({
    name: "",
    url: "",
    headerName: "",
    headerValue: "",
    bearerToken: "",
    oauthClientId: "",
  });

  // OAuth callback URI for dialogs
  const oauthCallbackUri = typeof window !== "undefined"
    ? `${window.location.origin}/api/mcp/oauth/callback`
    : "";

  // Queries
  const { data: catalogItems = [], isLoading: catalogLoading } = useCatalog();
  const { data: servers = [], isLoading: serversLoading } = useServers(user?.id);

  // Mutations
  const addServer = useAddServer();
  const deleteServer = useDeleteServer();
  const toggleServer = useToggleServer();
  const testServer = useTestServer();
  const oauthStart = useOAuthStart();
  const oauthDisconnect = useOAuthDisconnect();
  const fetchServerTools = useFetchServerTools();
  const saveDisabledTools = useSaveDisabledTools();

  // Connected URLs for quick lookup
  const connectedUrls = new Set(servers.map((s) => s.url.replace(/\/$/, "")));

  // Featured items
  const featuredItems = catalogItems.filter((item) =>
    FEATURED_NAMES.includes(item.name)
  );

  // ─── Dialog handlers ─────────────────────────────────────────────────────────

  const resetCustomForm = () => {
    setCustomForm({ name: "", url: "", authType: "none", bearerToken: "", headerName: "", headerValue: "" });
  };

  const openEdit = (server: ServerItem) => {
    setEditTarget(server);
    setEditForm({
      name: server.name,
      url: server.url,
      headerName: "",
      headerValue: "",
      bearerToken: "",
      oauthClientId: "",
    });
  };

  // ─── Actions ────────────────────────────────────────────────────────────────

  const handleAdd = async (item: CatalogItem) => {
    setAddingUrl(item.url);
    try {
      if (item.auth === "apikey") {
        setApiKeyTarget(item);
        setApiKeyValues({});
        return;
      }
      if (item.auth === "oauth" && item.oauthSetup?.length) {
        setOauthSetupTarget(item);
        setOauthSetupValues({});
        return;
      }

      const result = await addServer.mutateAsync(item);
      if (item.auth === "oauth") {
        setConnectingId(result.server.id);
        try {
          const oauthResult = await oauthStart.mutateAsync(result.server.id);
          if (oauthResult.authorizationUrl) {
            window.location.assign(oauthResult.authorizationUrl);
            return;
          }
        } finally {
          setConnectingId(null);
        }
      }
      toast.success(`${item.name} added`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add server");
    } finally {
      setAddingUrl(null);
    }
  };

  const handleCustomAdd = async () => {
    if (!customForm.name.trim() || !customForm.url.trim()) return;
    const lower = customForm.url.toLowerCase();
    const body: Record<string, unknown> = {
      name: customForm.name.trim(),
      url: customForm.url.trim(),
      isEnabled: true,
      authType: customForm.authType,
      transportType: lower.endsWith("/sse") || lower.includes("/sse?") ? "sse" : "http",
    };
    if (customForm.authType === "bearer" && customForm.bearerToken) {
      body.bearerToken = customForm.bearerToken.trim();
    }
    if (customForm.authType === "header" && customForm.headerName && customForm.headerValue) {
      body.headerName = customForm.headerName.trim();
      body.headerValue = customForm.headerValue.trim();
    }

    try {
      const res = await fetch("/api/mcp/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to add server");

      if (customForm.authType === "oauth") {
        setConnectingId(data.server.id);
        try {
          const oauthRes = await fetch(`/api/mcp/servers/${data.server.id}/oauth/start`, { method: "POST" });
          const oauthData = await oauthRes.json();
          if (!oauthRes.ok) throw new Error(oauthData?.error || "Failed to start OAuth");
          if (oauthData.authorizationUrl) {
            window.location.assign(oauthData.authorizationUrl);
            setShowCustomDialog(false);
            resetCustomForm();
            return;
          }
        } finally {
          setConnectingId(null);
        }
      }
      toast.success(`${customForm.name} added`);
      setShowCustomDialog(false);
      resetCustomForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add server");
    }
  };

  const handleApiKeyAdd = async () => {
    if (!apiKeyTarget) return;
    const allFilled = apiKeyTarget.fields?.every((f) => apiKeyValues[f.label]?.trim());
    if (!allFilled) return;

    const body: Record<string, unknown> = {
      name: apiKeyTarget.name,
      url: apiKeyTarget.url,
      isEnabled: true,
      authType: "header",
      transportType: getTransportType(apiKeyTarget.url),
      headerName: apiKeyTarget.fields?.[0]?.headerName ?? "Authorization",
      headerValue: apiKeyValues[apiKeyTarget.fields?.[0]?.label ?? ""] ?? "",
    };

    try {
      const res = await fetch("/api/mcp/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to add server");
      toast.success(`${apiKeyTarget.name} added`);
      setApiKeyTarget(null);
      setApiKeyValues({});
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add server");
    }
  };

  const handleOAuthSetupAdd = async () => {
    if (!oauthSetupTarget) return;
    const allFilled = oauthSetupTarget.oauthSetup?.every((f) => oauthSetupValues[f.key]?.trim());
    if (!allFilled) return;

    const creds: Record<string, string> = {};
    oauthSetupTarget.oauthSetup?.forEach((f) => {
      creds[f.key] = oauthSetupValues[f.key] ?? "";
    });

    const body: Record<string, unknown> = {
      name: oauthSetupTarget.name,
      url: oauthSetupTarget.url,
      isEnabled: true,
      authType: "oauth",
      transportType: getTransportType(oauthSetupTarget.url),
      oauthClientId: creds.oauthClientId,
      oauthClientSecret: creds.oauthClientSecret,
    };

    try {
      const res = await fetch("/api/mcp/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to add server");

      setConnectingId(data.server.id);
      try {
        const oauthRes = await fetch(`/api/mcp/servers/${data.server.id}/oauth/start`, { method: "POST" });
        const oauthData = await oauthRes.json();
        if (!oauthRes.ok) throw new Error(oauthData?.error || "Failed to start OAuth");
        if (oauthData.authorizationUrl) {
          window.location.assign(oauthData.authorizationUrl);
          setOauthSetupTarget(null);
          setOauthSetupValues({});
          return;
        }
      } finally {
        setConnectingId(null);
      }
      toast.success(`${oauthSetupTarget.name} added`);
      setOauthSetupTarget(null);
      setOauthSetupValues({});
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add server");
    }
  };

  const handleEditSave = async () => {
    if (!editTarget || !editForm.name.trim() || !editForm.url.trim()) return;
    const body: Record<string, unknown> = {
      name: editForm.name.trim(),
      url: editForm.url.trim(),
    };
    if (editTarget.authType === "header" && editForm.headerValue) {
      body.headerName = editForm.headerName || "Authorization";
      body.headerValue = editForm.headerValue.trim();
    }
    if (editTarget.authType === "bearer" && editForm.bearerToken) {
      body.bearerToken = editForm.bearerToken.trim();
    }
    if (editTarget.authType === "oauth" && editForm.oauthClientId) {
      body.oauthClientId = editForm.oauthClientId.trim();
    }

    try {
      const res = await fetch(`/api/mcp/servers/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to update server");
      toast.success("Server updated");
      setEditTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update server");
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteServer.mutateAsync(id);
      toast.success("Server deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete server");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const handleToggle = async (id: string, isEnabled: boolean) => {
    setTogglingId(id);
    try {
      await toggleServer.mutateAsync({ id, isEnabled });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to toggle server");
    } finally {
      setTogglingId(null);
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const result = await testServer.mutateAsync(id);
      toast.success(`Connected! Found ${result.toolCount} tools`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Connection failed");
    } finally {
      setTestingId(null);
    }
  };

  const handleOAuthStart = async (id: string) => {
    setConnectingId(id);
    try {
      const result = await oauthStart.mutateAsync(id);
      if (result.authorizationUrl) {
        window.location.assign(result.authorizationUrl);
      } else {
        toast.error(result.error || "Failed to start OAuth");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start OAuth");
    } finally {
      setConnectingId(null);
    }
  };

  const handleOAuthDisconnect = async (id: string) => {
    try {
      await oauthDisconnect.mutateAsync(id);
      toast.success("OAuth disconnected");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to disconnect OAuth");
    }
  };

  const handleToolsToggle = (serverId: string) => {
    const next = expandedToolsId === serverId ? null : serverId;
    setExpandedToolsId(next);
    if (next && !serverToolsCache[next] && !toolsLoading[next]) {
      setToolsLoading((prev) => ({ ...prev, [next]: true }));
      fetchServerTools.mutate(next, {
        onSuccess: (tools) => {
          setServerToolsCache((prev) => ({ ...prev, [next]: tools }));
          setToolsLoading((prev) => ({ ...prev, [next]: false }));
        },
        onError: () => {
          setServerToolsCache((prev) => ({ ...prev, [next]: [] }));
          setToolsLoading((prev) => ({ ...prev, [next]: false }));
        },
      });
    }
  };

  const handleToolToggle = (serverId: string, currentDisabled: string[], toolName: string) => {
    const newDisabled = currentDisabled.includes(toolName)
      ? currentDisabled.filter((t) => t !== toolName)
      : [...currentDisabled, toolName];

    // Optimistic update - keep the current cached tools
    setServerToolsCache((prev) => ({ ...prev }));

    saveDisabledTools.mutate(
      { serverId, disabledTools: newDisabled },
      {
        onError: () => {
          // Refetch tools on failure
          fetchServerTools.mutate(serverId, {
            onSuccess: (tools) => {
              setServerToolsCache((prev) => ({ ...prev, [serverId]: tools }));
            },
          });
        },
      }
    );
  };

  const handleEnableAllTools = (serverId: string) => {
    saveDisabledTools.mutate({ serverId, disabledTools: [] });
  };

  const handleCustomOpen = () => {
    setShowCustomDialog(true);
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 py-8 overflow-auto">
        <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight mb-6">Apps</h1>

            {/* Tabs + search */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
              <Tabs
                value={activeTab}
                onValueChange={(v) =>
                  handleTabChange(v as "browse" | "my-servers")
                }
              >
                <TabsList variant="line" className="bg-transparent p-0 overflow-visible">
                  <TabsTrigger
                    value="browse"
                    className="data-active:bg-transparent data-active:shadow-none data-active:after:opacity-100 px-3"
                  >
                    Browse
                  </TabsTrigger>
                  <TabsTrigger
                    value="my-servers"
                    className="data-active:bg-transparent data-active:shadow-none data-active:after:opacity-100 px-3 flex items-center gap-2 hide-scrollbar"
                  >
                    My Apps
                    <span
                      className={cn(
                        "text-[10px] font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full",
                        servers.length === 0 && "invisible"
                      )}
                    >
                      {servers.length}
                    </span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {activeTab === "browse" && (
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search apps..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 bg-muted/50 border-0 focus:bg-background"
                  />
                </div>
              )}
            </div>

            {/* Category pills */}
            {activeTab === "browse" && (
              <div className="flex gap-2 mt-4 overflow-x-auto pb-2 -mx-4 px-4 hide-scrollbar">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={cn(
                      "px-3.5 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-all duration-200",
                      category === cat.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Content */}
          {activeTab === "browse" ? (
            catalogLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Featured section */}
                {!search && category === "all" && featuredItems.length > 0 && (
                  <div className="mb-8 space-y-3">
                    <h2 className="text-sm font-semibold">Featured</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {featuredItems.map((item) => (
                        <CatalogCard
                          key={item.name}
                          item={item}
                          isConnected={connectedUrls.has(item.url.replace(/\/$/, ""))}
                          isAdding={addingUrl === item.url}
                          onAdd={handleAdd}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* All servers grid */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold">
                      {search || category !== "all" ? "Results" : "All Servers"}
                    </h2>
                  </div>

                  <CatalogGrid
                    search={search}
                    category={category}
                    connectedUrls={connectedUrls}
                    addingUrl={addingUrl}
                    items={catalogItems}
                    onAdd={handleAdd}
                  />

                  {/* Add custom card */}
                  <button
                    type="button"
                    onClick={handleCustomOpen}
                    className="w-full h-[120px] shadow-none bg-card/30 cursor-pointer border-dashed border border-border/60 hover:border-primary/40 hover:bg-card/50 transition-all duration-200 flex items-center justify-center rounded-xl group"
                  >
                    <div className="flex flex-col items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
                      <div className="size-8 rounded-xl bg-muted/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                        <Plus className="size-4" />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground mt-2">Add custom server</span>
                    </div>
                  </button>
                </div>
              </>
            )
          ) : serversLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ServerList
              servers={servers}
              testingId={testingId}
              deletingId={deletingId}
              togglingId={togglingId}
              connectingId={connectingId}
              confirmDeleteId={confirmDeleteId}
              expandedToolsId={expandedToolsId}
              serverToolsCache={serverToolsCache}
              toolsLoading={toolsLoading}
              onToggle={handleToggle}
              onDelete={(id) => setConfirmDeleteId(id)}
              onTest={handleTest}
              onOAuthStart={handleOAuthStart}
              onOAuthDisconnect={handleOAuthDisconnect}
              onConfirmDelete={() =>
                confirmDeleteId && handleDelete(confirmDeleteId)
              }
              onCancelDelete={() => setConfirmDeleteId(null)}
              onToolsToggle={handleToolsToggle}
              onToolToggle={handleToolToggle}
              onEnableAllTools={handleEnableAllTools}
            />
          )}
        </div>
      </div>

      {/* ── Custom server dialog ──────────────────────────────────────────── */}
      <Dialog open={showCustomDialog} onOpenChange={(v) => { if (!v) { setShowCustomDialog(false); resetCustomForm(); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add custom app</DialogTitle>
            <DialogDescription className="text-pretty">
              Connect any MCP-compatible remote endpoint.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Name</Label>
                <Input
                  placeholder="My Server"
                  value={customForm.name}
                  onChange={(e) => setCustomForm((p) => ({ ...p, name: e.target.value }))}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Auth</Label>
                <Select
                  value={customForm.authType}
                  onValueChange={(v) => setCustomForm((p) => ({ ...p, authType: v as typeof customForm.authType }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No auth</SelectItem>
                    <SelectItem value="bearer">Bearer token</SelectItem>
                    <SelectItem value="header">Custom header</SelectItem>
                    <SelectItem value="oauth">OAuth</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">URL</Label>
              <Input
                placeholder="https://your-mcp-server.com/mcp"
                value={customForm.url}
                onChange={(e) => setCustomForm((p) => ({ ...p, url: e.target.value }))}
              />
            </div>
            {customForm.authType === "bearer" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Bearer token</Label>
                <Input
                  type="password"
                  placeholder="sk-…"
                  value={customForm.bearerToken}
                  onChange={(e) => setCustomForm((p) => ({ ...p, bearerToken: e.target.value }))}
                />
              </div>
            )}
            {customForm.authType === "header" && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Header name</Label>
                  <Input
                    placeholder="x-api-key"
                    value={customForm.headerName}
                    onChange={(e) => setCustomForm((p) => ({ ...p, headerName: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Header value</Label>
                  <Input
                    type="password"
                    placeholder="sk-…"
                    value={customForm.headerValue}
                    onChange={(e) => setCustomForm((p) => ({ ...p, headerValue: e.target.value }))}
                  />
                </div>
              </div>
            )}
            {customForm.authType === "oauth" && (
              <p className="text-xs font-medium text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                OAuth endpoints will be auto-discovered from the server URL after adding.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setShowCustomDialog(false); resetCustomForm(); }}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCustomAdd}
              disabled={!customForm.name.trim() || !customForm.url.trim() || addServer.isPending}
            >
              {addServer.isPending ? "Adding…" : customForm.authType === "oauth" ? "Add & Connect" : "Add App"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── API Key dialog ───────────────────────────────────────────────── */}
      <Dialog open={!!apiKeyTarget} onOpenChange={(v) => { if (!v) { setApiKeyTarget(null); setApiKeyValues({}); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="size-7 flex items-center justify-center overflow-hidden shrink-0">
                {apiKeyTarget && (
                  <ServiceIcon
                    url={apiKeyTarget.maintainerUrl}
                    name={apiKeyTarget.name}
                    size={20}
                    customIcon={getMcpCatalogIcon(apiKeyTarget.url)}
                  />
                )}
              </div>
              <DialogTitle>Connect {apiKeyTarget?.name}</DialogTitle>
            </div>
            <DialogDescription className="text-pretty">
              {apiKeyTarget?.fields?.length
                ? "Enter your credentials to connect this app."
                : <>Sent as <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">Authorization: Bearer …</code></>}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            {apiKeyTarget?.fields?.length ? (
              apiKeyTarget.fields.map((field, i) => (
                <div key={field.label} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">{field.label}</Label>
                    {field.hintUrl && (
                      <a
                        href={field.hintUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground/60 hover:text-primary flex items-center gap-0.5 transition-colors"
                      >
                        {field.hintText ?? "Get credentials"}
                        <ArrowUpRight className="size-3 ml-0.5" />
                      </a>
                    )}
                  </div>
                  <Input
                    type="password"
                    placeholder={field.placeholder}
                    value={apiKeyValues[field.label] ?? ""}
                    onChange={(e) => setApiKeyValues((p) => ({ ...p, [field.label]: e.target.value }))}
                    autoFocus={i === 0}
                  />
                  {field.steps && field.steps.length > 0 && (
                    <div className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2.5 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">How to get your token</p>
                      <ol className="space-y-2">
                        {field.steps.map((step, si) => (
                          <li key={si} className="flex gap-2 text-xs text-muted-foreground/80 leading-relaxed">
                            <span className="shrink-0 font-medium text-muted-foreground/50 tabular-nums">{si + 1}.</span>
                            <span className="space-y-1.5">
                              <span className="block">
                                {step.text}
                                {step.url && (
                                  <a
                                    href={step.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ml-1 text-primary hover:text-primary/80 inline-flex items-center gap-0.5 transition-colors"
                                  >
                                    {step.urlLabel ?? step.url}
                                    <ArrowUpRight className="size-3" />
                                  </a>
                                )}
                              </span>
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">API Key</Label>
                <Input
                  type="password"
                  placeholder="sk-…"
                  value={apiKeyValues["apiKey"] ?? ""}
                  onChange={(e) => setApiKeyValues((p) => ({ ...p, apiKey: e.target.value }))}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setApiKeyTarget(null); setApiKeyValues({}); }}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleApiKeyAdd}
              disabled={
                addServer.isPending ||
                !apiKeyTarget?.fields?.every((f) => apiKeyValues[f.label]?.trim())
              }
            >
              {addServer.isPending ? "Adding…" : "Add App"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── OAuth setup dialog ───────────────────────────────────────────── */}
      <Dialog open={!!oauthSetupTarget} onOpenChange={(v) => { if (!v) { setOauthSetupTarget(null); setOauthSetupValues({}); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="size-7 flex items-center justify-center overflow-hidden shrink-0">
                {oauthSetupTarget && (
                  <ServiceIcon
                    url={oauthSetupTarget.maintainerUrl}
                    name={oauthSetupTarget.name}
                    size={20}
                    customIcon={getMcpCatalogIcon(oauthSetupTarget.url)}
                  />
                )}
              </div>
              <DialogTitle>Connect {oauthSetupTarget?.name}</DialogTitle>
            </div>
            <DialogDescription className="text-pretty">
              {oauthSetupTarget?.name} requires a pre-registered OAuth app. You&apos;ll be redirected to authorize after entering your credentials.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            {oauthSetupTarget?.oauthSetup?.map((field, i) => (
              <div key={field.key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">{field.label}</Label>
                  {field.hintUrl && (
                    <a
                      href={field.hintUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground/60 hover:text-primary flex items-center gap-0.5 transition-colors"
                    >
                      {field.hintText ?? "Get credentials"}
                      <ArrowUpRight className="size-3 ml-0.5" />
                    </a>
                  )}
                </div>
                <Input
                  type="password"
                  placeholder={field.placeholder}
                  value={oauthSetupValues[field.key] ?? ""}
                  onChange={(e) => setOauthSetupValues((p) => ({ ...p, [field.key]: e.target.value }))}
                  autoFocus={i === 0}
                />
              </div>
            ))}
            <div className="space-y-1.5 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs text-muted-foreground">Redirect URI</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(oauthCallbackUri);
                      toast.success("Copied redirect URI");
                    } catch {
                      toast.error("Copy failed");
                    }
                  }}
                >
                  Copy
                </Button>
              </div>
              <code className="block text-xs text-foreground/80 wrap-break-word whitespace-pre-wrap">
                {oauthCallbackUri}
              </code>
            </div>
            <p className="text-xs font-medium text-muted-foreground/60">
              Stored securely · you&apos;ll be redirected to authorize
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setOauthSetupTarget(null); setOauthSetupValues({}); }}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleOAuthSetupAdd}
              disabled={
                addServer.isPending ||
                !oauthSetupTarget?.oauthSetup?.every((f) => oauthSetupValues[f.key]?.trim())
              }
            >
              {addServer.isPending ? "Adding…" : "Add & Connect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit server dialog ───────────────────────────────────────────── */}
      <Dialog open={!!editTarget} onOpenChange={(v) => { if (!v) setEditTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="size-7 flex items-center justify-center overflow-hidden shrink-0">
                {editTarget && <ServiceIcon url={editTarget.url} name={editTarget.name} size={20} />}
              </div>
              <DialogTitle>Edit {editTarget?.name}</DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Name</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">URL</Label>
              <Input
                value={editForm.url}
                onChange={(e) => setEditForm((p) => ({ ...p, url: e.target.value }))}
                placeholder="https://…"
              />
            </div>
            {editTarget?.authType === "header" && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Header name</Label>
                  <Input
                    value={editForm.headerName}
                    onChange={(e) => setEditForm((p) => ({ ...p, headerName: e.target.value }))}
                    placeholder="Authorization"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    New header value <span className="text-muted-foreground/50">(leave blank to keep existing)</span>
                  </Label>
                  <Input
                    type="password"
                    value={editForm.headerValue}
                    onChange={(e) => setEditForm((p) => ({ ...p, headerValue: e.target.value }))}
                    placeholder="Bearer sk-…"
                  />
                </div>
              </>
            )}
            {editTarget?.authType === "bearer" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  New token <span className="text-muted-foreground/50">(leave blank to keep existing)</span>
                </Label>
                <Input
                  type="password"
                  value={editForm.bearerToken}
                  onChange={(e) => setEditForm((p) => ({ ...p, bearerToken: e.target.value }))}
                  placeholder="sk-…"
                />
              </div>
            )}
            {editTarget?.authType === "oauth" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  OAuth Client ID <span className="text-muted-foreground/50">(leave blank to keep existing)</span>
                </Label>
                <Input
                  value={editForm.oauthClientId}
                  onChange={(e) => setEditForm((p) => ({ ...p, oauthClientId: e.target.value }))}
                  placeholder="Client ID…"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button
              size="sm"
              onClick={handleEditSave}
              disabled={!editForm.name.trim() || !editForm.url.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
