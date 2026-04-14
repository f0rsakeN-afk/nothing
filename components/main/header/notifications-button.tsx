"use client";

import { memo, useState, useCallback, useRef, useEffect } from "react";
import {
  Bell,
  ChevronDown,
  ChevronLeft,
  MoreHorizontal,
  Settings2,
  Check,
  Mails,
  Mail,
  Clock,
  Archive,
  CheckCheck,
  ArchiveRestore,
  Activity,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNotificationStream } from "@/hooks/useNotificationStream";
import { toast } from "@/components/ui/sileo-toast";
import { Loader2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FilterType = "all" | "unread" | "snoozed" | "archived";
type ViewType = "inbox" | "settings";
type NotificationAction = "read" | "unread" | "archive" | "unarchive" | "snooze" | "unsnooze";

type Notification = {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
  archived: boolean;
  snoozed: boolean;
  accent: string;
};

type PrefCategory = {
  id: string;
  label: string;
  channels: string;
  enabled: boolean;
};

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
  prefs: {
    newFeature: boolean;
    credits: boolean;
    system: boolean;
    tips: boolean;
    security: boolean;
  };
}

async function fetchNotifications(filter: FilterType): Promise<NotificationsResponse> {
  const res = await fetch(`/api/notifications?filter=${filter}`);
  if (!res.ok) throw new Error("Failed to fetch notifications");
  return res.json();
}

async function updatePref(id: string, enabled: boolean): Promise<void> {
  const prefMap: Record<string, string> = {
    "new-feature": "newFeature",
    credits: "credits",
    system: "system",
    tips: "tips",
    security: "security",
  };
  const key = prefMap[id];
  if (!key) throw new Error(`Unknown preference: ${id}`);

  const res = await fetch("/api/notifications", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefs: { [key]: enabled } }),
  });
  if (!res.ok) throw new Error("Failed to update preference");
}

async function updateNotification(id: string, action: NotificationAction, duration?: number): Promise<void> {
  const body = duration !== undefined
    ? { notificationId: id, action, duration }
    : { notificationId: id, action };

  const res = await fetch("/api/notifications", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Failed to ${action}`);
}

async function bulkAction(action: "read-all" | "archive-read" | "archive-all" | "unarchive-all"): Promise<void> {
  const res = await fetch("/api/notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  if (!res.ok) throw new Error(`Failed to ${action}`);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PREFS: PrefCategory[] = [
  { id: "new-feature", label: "New Features", channels: "In-App", enabled: true },
  { id: "credits", label: "Credits & Billing", channels: "Email, In-App", enabled: true },
  { id: "system", label: "System Updates", channels: "In-App, Push", enabled: false },
  { id: "tips", label: "Tips & Suggestions", channels: "In-App", enabled: true },
  { id: "security", label: "Security Alerts", channels: "Email, Push", enabled: true },
];

const FILTER_OPTIONS: { value: FilterType; label: string; icon: React.ElementType }[] = [
  { value: "all", label: "Unread & read", icon: Mails },
  { value: "unread", label: "Unread only", icon: Mail },
  { value: "snoozed", label: "Snoozed", icon: Clock },
  { value: "archived", label: "Archived", icon: Archive },
];

// ---------------------------------------------------------------------------
// NotificationItem - pure presentational, menu handled by parent
// ---------------------------------------------------------------------------

interface NotificationItemProps {
  notification: Notification;
  onMenuToggle: (id: string) => void;
}

const NotificationItem = memo(function NotificationItem({
  notification,
  onMenuToggle,
}: NotificationItemProps) {
  return (
    <div
      className={cn(
        "group flex gap-3 rounded-lg px-3 py-2.5 transition-colors relative",
        notification.read ? "opacity-60 hover:opacity-100" : "bg-accent/40 hover:bg-accent/60",
      )}
    >
      <span
        className={cn(
          "mt-2 h-1.5 w-1.5 shrink-0 rounded-full",
          notification.accent,
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium leading-snug text-foreground">
          {notification.title}
        </p>
        <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
          {notification.description}
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground/50">
          {notification.time}
        </p>
      </div>

      {/* Context menu trigger */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onMenuToggle(notification.id);
        }}
        className="notification-menu-trigger absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Notification actions"
      >
        <MoreHorizontal className="h-4 w-4 text-muted-foreground/60" />
      </button>
    </div>
  );
}, (prev, next) => {
  // Custom equality - only re-render if notification data changed
  return (
    prev.notification.id === next.notification.id &&
    prev.notification.read === next.notification.read &&
    prev.notification.archived === next.notification.archived &&
    prev.notification.snoozed === next.notification.snoozed &&
    prev.notification.title === next.notification.title &&
    prev.notification.description === next.notification.description
  );
});

// ---------------------------------------------------------------------------
// NotificationMenu - rendered once outside list, positioned by data attribute
// ---------------------------------------------------------------------------

interface NotificationMenuProps {
  notificationId: string;
  read: boolean;
  archived: boolean;
  snoozed: boolean;
  onAction: (id: string, action: NotificationAction, duration?: number) => void;
  onClose: () => void;
}

const NotificationMenu = memo(function NotificationMenu({
  notificationId,
  read,
  archived,
  snoozed,
  onAction,
  onClose,
}: NotificationMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handleAction = (action: NotificationAction, duration?: number) => {
    onAction(notificationId, action, duration);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="absolute right-2 top-8 z-30 w-44 overflow-hidden rounded-lg border border-border bg-popover shadow-md"
    >
      {!read && (
        <MenuButton icon={CheckCheck} label="Mark as read" onClick={() => handleAction("read")} />
      )}
      {read && (
        <MenuButton icon={Mail} label="Mark as unread" onClick={() => handleAction("unread")} />
      )}
      {!archived && (
        <>
          <MenuButton icon={Clock} label="Snooze 1h" onClick={() => handleAction("snooze", 60)} />
          <MenuButton icon={Clock} label="Snooze 24h" onClick={() => handleAction("snooze", 1440)} />
        </>
      )}
      {snoozed && (
        <MenuButton icon={EyeOff} label="Unsnooze" onClick={() => handleAction("unsnooze")} />
      )}
      {!archived ? (
        <MenuButton icon={Archive} label="Archive" onClick={() => handleAction("archive")} />
      ) : (
        <MenuButton icon={ArchiveRestore} label="Unarchive" onClick={() => handleAction("unarchive")} />
      )}
    </div>
  );
});

function MenuButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2.5 px-3 py-2 text-[12px] text-foreground/80 hover:bg-accent/60 hover:text-foreground transition-colors"
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// PrefRow
// ---------------------------------------------------------------------------

const PrefRow = memo(function PrefRow({
  pref,
  onToggle,
  updating,
}: {
  pref: PrefCategory;
  onToggle: (id: string, enabled: boolean) => void;
  updating: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 hover:bg-accent/40 transition-colors">
      <div className="flex min-w-0 items-start gap-2.5">
        <Activity className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-foreground">{pref.label}</p>
          <p className="text-[11px] text-muted-foreground/60">{pref.channels}</p>
        </div>
      </div>
      <Switch
        size="sm"
        checked={pref.enabled}
        onCheckedChange={(checked) => onToggle(pref.id, checked)}
        disabled={updating}
        className="shrink-0"
      />
    </div>
  );
}, (prev, next) => prev.pref.enabled === next.pref.enabled && prev.updating === next.updating);

// ---------------------------------------------------------------------------
// NotificationsButton
// ---------------------------------------------------------------------------

export const NotificationsButton = memo(function NotificationsButton() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<ViewType>("inbox");

  // Subscribe to real-time notification updates
  useNotificationStream({
    onNewNotification: (notification) => {
      toast(notification.title, {
        description: notification.description,
      });
    },
  });
  const [filter, setFilter] = useState<FilterType>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [localPrefs, setLocalPrefs] = useState<Partial<Record<string, boolean>>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", filter],
    queryFn: () => fetchNotifications(filter),
    staleTime: 30000, // Cache for 30s to avoid unnecessary refetches
  });

  // Single mutation for all notification actions
  const notificationMutation = useMutation({
    mutationFn: ({ id, action, duration }: { id: string; action: NotificationAction; duration?: number }) =>
      updateNotification(id, action, duration),
    onMutate: ({ id, action, duration }) => {
      // Optimistically update
      queryClient.setQueryData<NotificationsResponse>(
        ["notifications", filter],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            notifications: old.notifications.map((n) => {
              if (n.id !== id) return n;
              const updated = { ...n };
              if (action === "read") updated.read = true;
              if (action === "unread") updated.read = false;
              if (action === "archive") updated.archived = true;
              if (action === "unarchive") updated.archived = false;
              if (action === "snooze") updated.snoozed = true;
              if (action === "unsnooze") updated.snoozed = false;
              return updated;
            }),
          };
        }
      );
    },
    onSuccess: () => {
      // Invalidate to get server state
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Single mutation for bulk actions
  const bulkMutation = useMutation({
    mutationFn: bulkAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setActionsOpen(false);
    },
  });

  // Pref mutation
  const prefMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => updatePref(id, enabled),
    onSuccess: (_, { id, enabled }) => {
      setLocalPrefs((prev) => ({ ...prev, [id]: enabled }));
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount ?? 0;
  const prefsFromApi = data?.prefs ?? {
    newFeature: true,
    credits: true,
    system: false,
    tips: true,
    security: true,
  };

  const prefs: PrefCategory[] = PREFS.map((p) => {
    const apiKey = p.id === "new-feature" ? "newFeature" : p.id;
    const enabled = localPrefs[p.id] !== undefined
      ? localPrefs[p.id]!
      : (prefsFromApi as Record<string, boolean>)[apiKey] ?? p.enabled;
    return { ...p, enabled };
  });

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "archived") return n.archived;
    if (filter === "unread") return !n.read && !n.archived && !n.snoozed;
    if (filter === "snoozed") return n.snoozed;
    return !n.archived;
  });

  const filterLabel = FILTER_OPTIONS.find((f) => f.value === filter)?.label.split(" ")[0] ?? "Inbox";

  const handleNotificationAction = useCallback(
    (id: string, action: NotificationAction, duration?: number) => {
      notificationMutation.mutate({ id, action, duration });
    },
    [notificationMutation]
  );

  const closeMenus = useCallback(() => {
    setFilterOpen(false);
    setActionsOpen(false);
    setActiveMenuId(null);
  }, []);

  const handleFilterSelect = useCallback((value: FilterType) => {
    setFilter(value);
    setFilterOpen(false);
  }, []);

  const handlePopoverOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setView("inbox");
        closeMenus();
      }
    },
    [closeMenus]
  );

  // Find the notification for the active menu
  const activeMenuNotification = activeMenuId
    ? notifications.find((n) => n.id === activeMenuId)
    : null;

  return (
    <Popover onOpenChange={handlePopoverOpenChange}>
      <PopoverTrigger
        className={cn(
          "relative flex h-8 w-8 items-center justify-center rounded-lg",
          "text-muted-foreground/60 hover:bg-accent/60 hover:text-foreground",
          "transition-colors duration-150",
        )}
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
        )}
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={8}
        className="w-80 p-0 overflow-visible"
      >
        {view === "inbox" && (
          <>
            {/* Overlay for closing sub-menus */}
            {(filterOpen || actionsOpen) && (
              <div className="fixed inset-0 z-10" onClick={closeMenus} />
            )}

            {/* Header */}
            <div className="relative flex items-center justify-between border-b border-border px-3 py-2.5">
              <button
                onClick={() => { setFilterOpen((o) => !o); setActionsOpen(false); }}
                className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[13px] font-semibold text-foreground hover:bg-accent/60 transition-colors"
              >
                {filterLabel}
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/60" />
              </button>

              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => { setActionsOpen((o) => !o); setFilterOpen(false); }}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/60 hover:bg-accent/60 hover:text-foreground transition-colors"
                  aria-label="More actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                <button
                  onClick={() => { setView("settings"); closeMenus(); }}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/60 hover:bg-accent/60 hover:text-foreground transition-colors"
                  aria-label="Notification preferences"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Filter dropdown */}
              {filterOpen && (
                <div className="absolute left-2 top-[calc(100%+4px)] z-20 w-48 overflow-hidden rounded-lg border border-border bg-popover shadow-md">
                  {FILTER_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => handleFilterSelect(opt.value)}
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-[12px] text-foreground/80 hover:bg-accent/60 hover:text-foreground transition-colors"
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                        <span className="flex-1 text-left">{opt.label}</span>
                        {filter === opt.value && <Check className="h-3.5 w-3.5 text-foreground/60" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Bulk actions dropdown */}
              {actionsOpen && (
                <div className="absolute right-2 top-[calc(100%+4px)] z-20 w-44 overflow-hidden rounded-lg border border-border bg-popover shadow-md">
                  {filter !== "archived" && (
                    <MenuButton
                      icon={CheckCheck}
                      label="Mark all as read"
                      onClick={() => bulkMutation.mutate("read-all")}
                    />
                  )}
                  {filter !== "archived" && (
                    <MenuButton
                      icon={ArchiveRestore}
                      label="Archive read"
                      onClick={() => bulkMutation.mutate("archive-read")}
                    />
                  )}
                  {filter === "archived" && (
                    <MenuButton
                      icon={ArchiveRestore}
                      label="Unarchive all"
                      onClick={() => bulkMutation.mutate("unarchive-all")}
                    />
                  )}
                  {filter !== "archived" && (
                    <MenuButton
                      icon={Archive}
                      label="Archive all"
                      onClick={() => bulkMutation.mutate("archive-all")}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Notification list */}
            <div className="max-h-72 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
                </div>
              ) : filteredNotifications.length === 0 ? (
                <p className="py-8 text-center text-[12px] text-muted-foreground/40">
                  No notifications
                </p>
              ) : (
                <div className="flex flex-col gap-0.5 p-1.5">
                  {filteredNotifications.map((n) => (
                    <div key={n.id} className="relative">
                      <NotificationItem notification={n} onMenuToggle={setActiveMenuId} />
                      {activeMenuId === n.id && activeMenuNotification && (
                        <NotificationMenu
                          notificationId={n.id}
                          read={activeMenuNotification.read}
                          archived={activeMenuNotification.archived}
                          snoozed={activeMenuNotification.snoozed}
                          onAction={handleNotificationAction}
                          onClose={() => setActiveMenuId(null)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {view === "settings" && (
          <>
            <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
              <button
                onClick={() => setView("inbox")}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/60 hover:bg-accent/60 hover:text-foreground transition-colors"
                aria-label="Back"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-[13px] font-semibold text-foreground">Preferences</span>
            </div>

            <div className="max-h-72 overflow-y-auto hide-scrollbar">
              <div className="border-b border-border px-3 py-2.5">
                <p className="text-[12px] font-semibold text-foreground">Global Preferences</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground/60">Email, In-App, Push</p>
              </div>
              <div className="flex flex-col gap-0.5 p-1.5">
                {prefs.map((pref) => (
                  <PrefRow
                    key={pref.id}
                    pref={pref}
                    onToggle={(id, enabled) => prefMutation.mutate({ id, enabled })}
                    updating={prefMutation.isPending}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
});
