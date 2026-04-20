"use client";

import * as React from "react";
import {
  Settings,
  Palette,
  Bot,
  Bell,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { GeneralSection } from "./sections/general";
import { AppearanceSection } from "./sections/appearance";
import { AiPreferencesSection } from "./sections/ai-preferences";
import { NotificationsSection } from "./sections/notifications";
import { PrivacySection } from "./sections/privacy";

interface SettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const TABS = [
  {
    id: "general",
    label: "General",
    description: "Conversations, language & behaviour",
    icon: Settings,
  },
  {
    id: "appearance",
    label: "Appearance",
    description: "Theme, display & motion",
    icon: Palette,
  },
  {
    id: "ai",
    label: "AI Preferences",
    description: "Model, response style & memory",
    icon: Bot,
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "Email and in-app alerts",
    icon: Bell,
  },
  {
    id: "privacy",
    label: "Privacy",
    description: "Data, exports & account",
    icon: ShieldCheck,
  },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ---------------------------------------------------------------------------
// Skeletons
// ---------------------------------------------------------------------------

function SettingsDialogSkeleton() {
  return (
    <div className="h-full flex">
      <div className="w-44 shrink-0 border-r border-border/50 p-2 space-y-1">
        <Skeleton className="h-3 w-16 mx-2 mb-3" />
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-8 w-full rounded-md" />
        ))}
      </div>
      <div className="flex-1 p-5 space-y-4">
        <div>
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-3 w-48 mb-4" />
        </div>
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    </div>
  );
}

function MobileSettingsSkeleton() {
  return (
    <div className="px-5 py-4 space-y-4">
      <div>
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-3 w-48 mb-4" />
      </div>
      <Skeleton className="h-32 w-full rounded-lg" />
      <Skeleton className="h-24 w-full rounded-lg" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section renderer
// ---------------------------------------------------------------------------

function SectionContent({ id }: { id: TabId }) {
  switch (id) {
    case "general":
      return <GeneralSection />;
    case "appearance":
      return <AppearanceSection />;
    case "ai":
      return <AiPreferencesSection />;
    case "notifications":
      return <NotificationsSection />;
    case "privacy":
      return <PrivacySection />;
  }
}

// ---------------------------------------------------------------------------
// Mobile drawer
// ---------------------------------------------------------------------------

interface MobileSettingRowProps {
  id: TabId;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  onSelect: (id: TabId) => void;
  isLast: boolean;
}

const MobileSettingRow = React.memo(function MobileSettingRow({
  id,
  label,
  description,
  icon: Icon,
  onSelect,
  isLast,
}: MobileSettingRowProps) {
  const handleClick = React.useCallback(() => onSelect(id), [id, onSelect]);

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-muted/40 active:bg-muted/60",
        !isLast && "border-b border-border/40",
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/60">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13.5px] font-semibold text-foreground leading-snug">
          {label}
        </p>
        <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">
          {description}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
    </button>
  );
});

interface MobileSettingsDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

function MobileSettingsDrawer({
  isOpen,
  onOpenChange,
}: MobileSettingsDrawerProps) {
  const [activeSection, setActiveSection] = React.useState<TabId | null>(null);

  React.useEffect(() => {
    if (!isOpen) setActiveSection(null);
  }, [isOpen]);

  const handleSelect = React.useCallback((id: TabId) => {
    setActiveSection(id);
  }, []);

  const handleBack = React.useCallback(() => {
    setActiveSection(null);
  }, []);

  const activeTab = activeSection
    ? TABS.find((t) => t.id === activeSection)
    : null;

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
                {activeTab?.label}
              </DrawerTitle>
            </div>
          ) : (
            <DrawerTitle className="text-[14px]">Settings</DrawerTitle>
          )}
        </DrawerHeader>

        {activeSection ? (
          <ScrollArea className="flex-1 min-h-0">
            <div className="px-5 py-4 pb-6">
              <SectionContent id={activeSection} />
            </div>
          </ScrollArea>
        ) : (
          <ScrollArea className="flex-1 min-h-0">
            <div className="py-2 pb-4">
              {TABS.map((tab, i) => (
                <MobileSettingRow
                  key={tab.id}
                  {...tab}
                  onSelect={handleSelect}
                  isLast={i === TABS.length - 1}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </DrawerContent>
    </Drawer>
  );
}

// ---------------------------------------------------------------------------
// Desktop dialog
// ---------------------------------------------------------------------------

interface DesktopSettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

function DesktopSettingsDialog({
  isOpen,
  onOpenChange,
}: DesktopSettingsDialogProps) {
  const [activeTab, setActiveTab] = React.useState<TabId>("general");

  const handleTabChange = React.useCallback((value: string) => {
    setActiveTab(value as TabId);
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-3xl p-0 gap-0 overflow-hidden"
        showCloseButton
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <Tabs
          orientation="vertical"
          value={activeTab}
          onValueChange={handleTabChange}
          className="h-[540px]"
        >
          <TabsList
            variant="line"
            className="w-44 shrink-0 border-r border-border/50 rounded-none h-full! flex flex-col justify-start p-2 gap-0.5"
          >
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60 px-2 py-2 mb-2.5">
              Settings
            </p>
            <div className="flex flex-col space-y-2">
              {TABS.map(({ id, label, icon: Icon }) => (
                <TabsTrigger
                  key={id}
                  value={id}
                  className="text-[12.5px] h-8 px-2 rounded-md gap-2"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {label}
                </TabsTrigger>
              ))}
            </div>
          </TabsList>

          <ScrollArea className="flex-1 hide-scrollbar">
            <div className="p-5">
              {TABS.map(({ id }) => (
                <TabsContent key={id} value={id}>
                  <SectionContent id={id} />
                </TabsContent>
              ))}
            </div>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export function SettingsDialog({ isOpen, onOpenChange }: SettingsDialogProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileSettingsDrawer isOpen={isOpen} onOpenChange={onOpenChange} />;
  }

  return <DesktopSettingsDialog isOpen={isOpen} onOpenChange={onOpenChange} />;
}
