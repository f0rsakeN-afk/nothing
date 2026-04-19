"use client";

import * as React from "react";
import { useUser } from "@stackframe/stack";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Loader2, ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CatalogGrid,
  ServerList,
  CATEGORIES,
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
import { useIsMobile } from "@/hooks/use-mobile";
import { ServiceIcon } from "@/components/apps/service-icon";

interface AppsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

// ---------------------------------------------------------------------------
// Mobile: list row for nav items
// ---------------------------------------------------------------------------

interface MobileNavRowProps {
  label: string;
  description?: string;
  icon: React.ReactNode;
  onClick: () => void;
  isLast: boolean;
}

function MobileNavRow({
  label,
  description,
  icon,
  onClick,
  isLast,
}: MobileNavRowProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-muted/40 active:bg-muted/60",
        !isLast && "border-b border-border/40",
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/60">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13.5px] font-semibold text-foreground leading-snug">
          {label}
        </p>
        {description && (
          <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">
            {description}
          </p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Shared content components
// ---------------------------------------------------------------------------

function BrowseContent({
  connectedUrls,
  onAdd,
}: {
  connectedUrls: Set<string>;
  onAdd: (item: { name: string; url: string; authType: string }) => void;
}) {
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState<CategoryId>("all");
  const [addingUrl, setAddingUrl] = React.useState<string | null>(null);

  const { data: catalogItems = [], isLoading: catalogLoading } = useCatalog();

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search apps..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-muted/50 border-0 focus:bg-background"
        />
      </div>

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 hide-scrollbar">
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

      {/* Grid */}
      {catalogLoading ? (
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
          onAdd={onAdd}
          columns={4}
        />
      )}
    </div>
  );
}

function MyAppsContent({ servers }: { servers: ServerItem[] }) {
  const [testingId, setTestingId] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [togglingId, setTogglingId] = React.useState<string | null>(null);
  const [connectingId, setConnectingId] = React.useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(
    null,
  );

  const deleteServer = useDeleteServer();
  const toggleServer = useToggleServer();
  const testServer = useTestServer();
  const oauthStart = useOAuthStart();
  const oauthDisconnect = useOAuthDisconnect();

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

  return (
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
      onConfirmDelete={() => confirmDeleteId && handleDelete(confirmDeleteId)}
      onCancelDelete={() => setConfirmDeleteId(null)}
    />
  );
}

// ---------------------------------------------------------------------------
// Mobile: drawer with Browse and My Apps as list items
// ---------------------------------------------------------------------------

function MobileAppsDrawer({ isOpen, onOpenChange }: AppsDialogProps) {
  const [activeSection, setActiveSection] = React.useState<
    "browse" | "my-apps" | null
  >(null);
  const [addingUrl, setAddingUrl] = React.useState<string | null>(null);
  const [connectingId, setConnectingId] = React.useState<string | null>(null);

  const addServer = useAddServer();
  const oauthStart = useOAuthStart();

  React.useEffect(() => {
    if (!isOpen) setActiveSection(null);
  }, [isOpen]);

  const handleSelect = React.useCallback((section: "browse" | "my-apps") => {
    setActiveSection(section);
  }, []);

  const handleBack = React.useCallback(() => {
    setActiveSection(null);
  }, []);

  const user = useUser();
  const { data: servers = [], isLoading: serversLoading } = useServers(
    user?.id,
  );
  const connectedUrls = new Set(servers.map((s) => s.url.replace(/\/$/, "")));

  const handleAdd = async (item: {
    name: string;
    url: string;
    authType: string;
  }) => {
    setAddingUrl(item.url);
    try {
      const result = await addServer.mutateAsync(item as any);

      if (item.authType === "oauth") {
        setConnectingId(result.server.id);
        try {
          const oauthResult = await oauthStart.mutateAsync(result.server.id);
          if (oauthResult.authorizationUrl) {
            window.location.assign(oauthResult.authorizationUrl);
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

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[78dvh] flex flex-col">
        <DrawerHeader className="shrink-0 pb-1">
          {activeSection ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleBack}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 -ml-1"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <DrawerTitle className="text-[14px]">
                {activeSection === "browse" ? "Browse Apps" : "My Apps"}
              </DrawerTitle>
            </div>
          ) : (
            <DrawerTitle className="text-[14px]">Apps</DrawerTitle>
          )}
        </DrawerHeader>

        {activeSection ? (
          <ScrollArea className="flex-1 min-h-0">
            <div className="px-5 py-4 pb-6">
              {activeSection === "browse" ? (
                <BrowseContent
                  connectedUrls={connectedUrls}
                  onAdd={handleAdd}
                />
              ) : serversLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <MyAppsContent servers={servers} />
              )}
            </div>
          </ScrollArea>
        ) : (
          <ScrollArea className="flex-1 min-h-0">
            <div className="py-2 pb-4">
              <MobileNavRow
                label="Browse Apps"
                description="Discover available apps to connect"
                icon={<Search className="h-4 w-4 text-muted-foreground" />}
                onClick={() => handleSelect("browse")}
                isLast={false}
              />
              <MobileNavRow
                label="My Apps"
                description="Manage your connected apps"
                icon={
                  <ServiceIcon
                    url="https://apps.example"
                    name="Apps"
                    size={16}
                  />
                }
                onClick={() => handleSelect("my-apps")}
                isLast={true}
              />
            </div>
          </ScrollArea>
        )}
      </DrawerContent>
    </Drawer>
  );
}

// ---------------------------------------------------------------------------
// Desktop: dialog with sidebar tabs
// ---------------------------------------------------------------------------

function DesktopAppsDialog({ isOpen, onOpenChange }: AppsDialogProps) {
  const [activeTab, setActiveTab] = React.useState<"browse" | "my-apps">(
    "browse",
  );
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState<CategoryId>("all");
  const [addingUrl, setAddingUrl] = React.useState<string | null>(null);
  const [testingId, setTestingId] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [togglingId, setTogglingId] = React.useState<string | null>(null);
  const [connectingId, setConnectingId] = React.useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(
    null,
  );

  const user = useUser();
  const { data: catalogItems = [], isLoading: catalogLoading } = useCatalog();
  const { data: servers = [], isLoading: serversLoading } = useServers(
    user?.id,
  );
  const addServer = useAddServer();
  const deleteServer = useDeleteServer();
  const toggleServer = useToggleServer();
  const testServer = useTestServer();
  const oauthStart = useOAuthStart();
  const oauthDisconnect = useOAuthDisconnect();

  const connectedUrls = new Set(servers.map((s) => s.url.replace(/\/$/, "")));

  const handleAdd = async (item: {
    name: string;
    url: string;
    authType: string;
  }) => {
    setAddingUrl(item.url);
    try {
      const result = await addServer.mutateAsync(item as any);

      if (item.authType === "oauth") {
        setConnectingId(result.server.id);
        try {
          const oauthResult = await oauthStart.mutateAsync(result.server.id);
          if (oauthResult.authorizationUrl) {
            window.location.assign(oauthResult.authorizationUrl);
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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-6xl p-0 gap-0 overflow-hidden"
        showCloseButton
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Apps</DialogTitle>
        </DialogHeader>

        <Tabs
          orientation="vertical"
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "browse" | "my-apps")}
          className="h-[75dvh]"
        >
          {/* Sidebar */}
          <TabsList
            variant="line"
            className="w-44 shrink-0 border-r border-border/50 rounded-none h-full! flex flex-col justify-start p-2 gap-0.5"
          >
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60 px-2 py-2 mb-2.5">
              Apps
            </p>
            <div className="flex flex-col space-y-2">
              <TabsTrigger
                value="browse"
                className="text-[12.5px] h-8 px-2 rounded-md gap-2"
              >
                <Search className="h-3.5 w-3.5 shrink-0" />
                Browse
              </TabsTrigger>
              <TabsTrigger
                value="my-apps"
                className="text-[12.5px] h-8 px-2 rounded-md gap-2"
              >
                <ServiceIcon url="https://apps.example" name="Apps" size={14} />
                My Apps
                {servers.length > 0 && (
                  <span className="text-[10px] font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full ml-auto">
                    {servers.length}
                  </span>
                )}
              </TabsTrigger>
            </div>
          </TabsList>

          {/* Content */}
          <ScrollArea className="flex-1 hide-scrollbar">
            <div className="p-5">
              {activeTab === "browse" ? (
                <div className="space-y-4">
                  {/* Search */}
                  <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      placeholder="Search apps..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 bg-muted/50 border-0 focus:bg-background"
                    />
                  </div>

                  {/* Category pills */}
                  {/* <div className="flex gap-2 overflow-x-auto wrap pb-2 -mx-4 px-4 hide-scrollbar">
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
                  </div> */}

                  {catalogLoading ? (
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
                      columns={4}
                    />
                  )}
                </div>
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
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function AppsDialog({ isOpen, onOpenChange }: AppsDialogProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileAppsDrawer isOpen={isOpen} onOpenChange={onOpenChange} />;
  }

  return <DesktopAppsDialog isOpen={isOpen} onOpenChange={onOpenChange} />;
}
