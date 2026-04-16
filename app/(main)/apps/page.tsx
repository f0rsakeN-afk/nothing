"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useUser } from "@stackframe/stack";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CatalogGrid,
  ServerList,
  CATEGORIES,
  CatalogItem,
  CategoryId,
  ServerItem,
} from "@/components/apps";
import {
  useCatalog,
  useServers,
  useAddServer,
  useDeleteServer,
  useToggleServer,
  useTestServer,
  useOAuthStart,
  useOAuthDisconnect,
} from "@/hooks/use-mcp-servers";

// ─── Page Component ────────────────────────────────────────────────────────────

export default function AppsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const user = useUser();

  // Tab state - synced with URL search params
  const activeTab = searchParams.get("tab") === "my-servers" ? "my-servers" : "browse";

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

  // Active operation IDs (to highlight the correct card)
  const [testingId, setTestingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);

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

  // Connected URLs for quick lookup
  const connectedUrls = new Set(servers.map((s) => s.url.replace(/\/$/, "")));

  // ─── Actions ────────────────────────────────────────────────────────────────

  const handleAdd = async (item: CatalogItem) => {
    setAddingUrl(item.url);
    try {
      const result = await addServer.mutateAsync(item);

      if (item.authType === "oauth") {
        setConnectingId(result.server.id);
        try {
          const oauthResult = await oauthStart.mutateAsync(result.server.id);
          if (oauthResult.authorizationUrl) {
            window.location.assign(oauthResult.authorizationUrl);
          } else {
            toast.error(oauthResult.error || "Failed to start OAuth");
          }
        } finally {
          setConnectingId(null);
        }
        return;
      }

      toast.success(`Added ${item.name}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add server",
      );
    } finally {
      setAddingUrl(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteServer.mutateAsync(id);
      toast.success("Server deleted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete server",
      );
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
      toast.error(
        error instanceof Error ? error.message : "Failed to toggle server",
      );
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
      toast.error(
        error instanceof Error ? error.message : "Connection failed",
      );
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
      toast.error(
        error instanceof Error ? error.message : "Failed to start OAuth",
      );
    } finally {
      setConnectingId(null);
    }
  };

  const handleOAuthDisconnect = async (id: string) => {
    try {
      await oauthDisconnect.mutateAsync(id);
      toast.success("OAuth disconnected");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to disconnect OAuth",
      );
    }
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
              <CatalogGrid
                search={search}
                category={category}
                connectedUrls={connectedUrls}
                addingUrl={addingUrl}
                items={catalogItems}
                onAdd={handleAdd}
              />
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
              onToggle={handleToggle}
              onDelete={(id) => setConfirmDeleteId(id)}
              onTest={handleTest}
              onOAuthStart={handleOAuthStart}
              onOAuthDisconnect={handleOAuthDisconnect}
              onConfirmDelete={() =>
                confirmDeleteId && handleDelete(confirmDeleteId)
              }
              onCancelDelete={() => setConfirmDeleteId(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
