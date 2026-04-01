"use client";

import { memo, useState, useCallback } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// ---------------------------------------------------------------------------
// Types & mock data
// ---------------------------------------------------------------------------

type FilterType = "all" | "unread" | "snoozed" | "archived";
type ViewType = "inbox" | "settings";

type Notification = {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
  archived: boolean;
  accent: string;
};

type PrefCategory = {
  id: string;
  label: string;
  channels: string;
  enabled: boolean;
};

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    title: "Welcome to Eryx!",
    description: "Get started with your first system design or search.",
    time: "2m ago",
    read: false,
    archived: false,
    accent: "bg-blue-400",
  },
  {
    id: "2",
    title: "Web Search is live",
    description: "Real-time web search with cited sources is now available.",
    time: "1h ago",
    read: false,
    archived: false,
    accent: "bg-violet-400",
  },
  {
    id: "3",
    title: "Credits refilled",
    description: "Your monthly 2,500 credits have been reset.",
    time: "2d ago",
    read: true,
    archived: false,
    accent: "bg-amber-400",
  },
];

const INITIAL_PREFS: PrefCategory[] = [
  {
    id: "new-feature",
    label: "New Features",
    channels: "In-App",
    enabled: true,
  },
  {
    id: "credits",
    label: "Credits & Billing",
    channels: "Email, In-App",
    enabled: true,
  },
  {
    id: "system",
    label: "System Updates",
    channels: "In-App, Push",
    enabled: false,
  },
  {
    id: "tips",
    label: "Tips & Suggestions",
    channels: "In-App",
    enabled: true,
  },
  {
    id: "security",
    label: "Security Alerts",
    channels: "Email, Push",
    enabled: true,
  },
];

const FILTER_OPTIONS: {
  value: FilterType;
  label: string;
  icon: React.ElementType;
}[] = [
  { value: "all", label: "Unread & read", icon: Mails },
  { value: "unread", label: "Unread only", icon: Mail },
  { value: "snoozed", label: "Snoozed", icon: Clock },
  { value: "archived", label: "Archived", icon: Archive },
];

// ---------------------------------------------------------------------------
// NotificationItem
// ---------------------------------------------------------------------------

const NotificationItem = memo(function NotificationItem({
  notification,
}: {
  notification: Notification;
}) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg px-3 py-2.5 transition-colors",
        notification.read ? "opacity-50" : "bg-accent/40",
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
    </div>
  );
});

// ---------------------------------------------------------------------------
// PrefRow
// ---------------------------------------------------------------------------

const PrefRow = memo(function PrefRow({
  pref,
  onToggle,
}: {
  pref: PrefCategory;
  onToggle: (id: string) => void;
}) {
  const handleChange = useCallback(
    () => onToggle(pref.id),
    [pref.id, onToggle],
  );

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 hover:bg-accent/40 transition-colors">
      <div className="flex min-w-0 items-start gap-2.5">
        <Activity className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-foreground">
            {pref.label}
          </p>
          <p className="text-[11px] text-muted-foreground/60">
            {pref.channels}
          </p>
        </div>
      </div>
      <Switch
        size="sm"
        checked={pref.enabled}
        onCheckedChange={handleChange}
        className="shrink-0"
      />
    </div>
  );
});

// ---------------------------------------------------------------------------
// NotificationsButton
// ---------------------------------------------------------------------------

export const NotificationsButton = memo(function NotificationsButton() {
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [prefs, setPrefs] = useState(INITIAL_PREFS);
  const [view, setView] = useState<ViewType>("inbox");
  const [filter, setFilter] = useState<FilterType>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);

  const unreadCount = notifications.filter(
    (n) => !n.read && !n.archived,
  ).length;

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "archived") return n.archived;
    if (filter === "unread") return !n.read && !n.archived;
    if (filter === "snoozed") return false; // no snoozed logic yet
    return !n.archived;
  });

  const filterLabel =
    FILTER_OPTIONS.find((f) => f.value === filter)?.label.split(" ")[0] ??
    "Inbox";

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setActionsOpen(false);
  }, []);

  const archiveAll = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, archived: true })));
    setActionsOpen(false);
  }, []);

  const archiveRead = useCallback(() => {
    setNotifications((prev) =>
      prev.map((n) => (n.read ? { ...n, archived: true } : n)),
    );
    setActionsOpen(false);
  }, []);

  const togglePref = useCallback((id: string) => {
    setPrefs((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)),
    );
  }, []);

  const closeMenus = useCallback(() => {
    setFilterOpen(false);
    setActionsOpen(false);
  }, []);

  const handleFilterSelect = useCallback((value: FilterType) => {
    setFilter(value);
    setFilterOpen(false);
  }, []);

  return (
    <Popover
      onOpenChange={(open) => {
        if (!open) {
          setView("inbox");
          closeMenus();
        }
      }}
    >
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
        {/* ── Inbox view ─────────────────────────────────────── */}
        {view === "inbox" && (
          <>
            {/* Transparent overlay to close sub-menus on outside click */}
            {(filterOpen || actionsOpen) && (
              <div className="fixed inset-0 z-10" onClick={closeMenus} />
            )}

            {/* Header */}
            <div className="relative flex items-center justify-between border-b border-border px-3 py-2.5">
              {/* Filter trigger */}
              <button
                onClick={() => {
                  setFilterOpen((o) => !o);
                  setActionsOpen(false);
                }}
                className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[13px] font-semibold text-foreground hover:bg-accent/60 transition-colors"
              >
                {filterLabel}
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/60" />
              </button>

              {/* Right actions */}
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => {
                    setActionsOpen((o) => !o);
                    setFilterOpen(false);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/60 hover:bg-accent/60 hover:text-foreground transition-colors"
                  aria-label="More actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setView("settings");
                    closeMenus();
                  }}
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
                        {filter === opt.value && (
                          <Check className="h-3.5 w-3.5 text-foreground/60" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Actions dropdown */}
              {actionsOpen && (
                <div className="absolute right-2 top-[calc(100%+4px)] z-20 w-44 overflow-hidden rounded-lg border border-border bg-popover shadow-md">
                  <button
                    onClick={markAllRead}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-[12px] text-foreground/80 hover:bg-accent/60 hover:text-foreground transition-colors"
                  >
                    <CheckCheck className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                    Mark all as read
                  </button>
                  <button
                    onClick={archiveAll}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-[12px] text-foreground/80 hover:bg-accent/60 hover:text-foreground transition-colors"
                  >
                    <Archive className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                    Archive all
                  </button>
                  <button
                    onClick={archiveRead}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-[12px] text-foreground/80 hover:bg-accent/60 hover:text-foreground transition-colors"
                  >
                    <ArchiveRestore className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                    Archive read
                  </button>
                </div>
              )}
            </div>

            {/* Notification list */}
            <div className="max-h-72 overflow-y-auto">
              {filteredNotifications.length === 0 ? (
                <p className="py-8 text-center text-[12px] text-muted-foreground/40">
                  No notifications
                </p>
              ) : (
                <div className="flex flex-col gap-0.5 p-1.5">
                  {filteredNotifications.map((n) => (
                    <NotificationItem key={n.id} notification={n} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Settings / Preferences view ────────────────────── */}
        {view === "settings" && (
          <>
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
              <button
                onClick={() => setView("inbox")}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/60 hover:bg-accent/60 hover:text-foreground transition-colors"
                aria-label="Back"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-[13px] font-semibold text-foreground">
                Preferences
              </span>
            </div>

            {/* Prefs list */}
            <div className="max-h-72 overflow-y-auto hide-scrollbar">
              {/* Global preferences row */}
              <div className="border-b border-border px-3 py-2.5">
                <p className="text-[12px] font-semibold text-foreground">
                  Global Preferences
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground/60">
                  Email, In-App, Push
                </p>
              </div>

              {/* Per-category toggles */}
              <div className="flex flex-col gap-0.5 p-1.5">
                {prefs.map((pref) => (
                  <PrefRow key={pref.id} pref={pref} onToggle={togglePref} />
                ))}
              </div>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
});
