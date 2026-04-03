"use client";

import * as React from "react";
import {
  User,
  CreditCard,
  BarChart2,
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
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { ProfileSection } from "./sections/profile";
import { PlanSection } from "./sections/plan";
import { UsageSection } from "./sections/usage";
import { SecuritySection } from "./sections/security";

// ── Tabs config — module-level so referentially stable ────────────────────

const TABS = [
  {
    id: "profile",
    label: "Profile",
    description: "Name, email & avatar",
    icon: User,
  },
  {
    id: "plan",
    label: "Plan",
    description: "Billing, credits & features",
    icon: CreditCard,
  },
  {
    id: "usage",
    label: "Usage",
    description: "Messages, tokens & activity",
    icon: BarChart2,
  },
  {
    id: "security",
    label: "Security",
    description: "Password, sessions & 2FA",
    icon: ShieldCheck,
  },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ── Section renderer — memoised so tab switches don't re-render siblings ──

const SectionContent = React.memo(function SectionContent({
  id,
}: {
  id: TabId;
}) {
  switch (id) {
    case "profile":
      return <ProfileSection />;
    case "plan":
      return <PlanSection />;
    case "usage":
      return <UsageSection />;
    case "security":
      return <SecuritySection />;
  }
});

// ── Mobile: individual tab row — memoised + stable callback ───────────────

const MobileTabRow = React.memo(function MobileTabRow({
  tab,
  isLast,
  onSelect,
}: {
  tab: (typeof TABS)[number];
  isLast: boolean;
  onSelect: (id: TabId) => void;
}) {
  const Icon = tab.icon;
  const handleClick = React.useCallback(
    () => onSelect(tab.id),
    [tab.id, onSelect],
  );

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-muted/40",
        !isLast && "border-b border-border/40",
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/60">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13.5px] font-semibold text-foreground leading-snug">
          {tab.label}
        </p>
        <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">
          {tab.description}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
    </button>
  );
});

// ── Mobile drawer ─────────────────────────────────────────────────────────

const MobileAccountDrawer = React.memo(function MobileAccountDrawer({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [activeSection, setActiveSection] = React.useState<TabId | null>(null);

  React.useEffect(() => {
    if (!isOpen) setActiveSection(null);
  }, [isOpen]);

  const handleSelect = React.useCallback(
    (id: TabId) => setActiveSection(id),
    [],
  );
  const handleBack = React.useCallback(() => setActiveSection(null), []);

  const activeTab = React.useMemo(
    () => (activeSection ? TABS.find((t) => t.id === activeSection) : null),
    [activeSection],
  );

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
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[13px] font-bold">
                ZA
              </div>
              <div>
                <DrawerTitle className="text-[14px] text-left">Account</DrawerTitle>
                <p className="text-[11.5px] text-muted-foreground/60 mt-0.5">
                  Nightcrawl3r · Basic Plan
                </p>
              </div>
            </div>
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
                <MobileTabRow
                  key={tab.id}
                  tab={tab}
                  isLast={i === TABS.length - 1}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </DrawerContent>
    </Drawer>
  );
});

// ── Desktop dialog ────────────────────────────────────────────────────────

const DesktopAccountDialog = React.memo(function DesktopAccountDialog({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [activeTab, setActiveTab] = React.useState<TabId>("profile");

  const handleTabChange = React.useCallback(
    (v: string) => setActiveTab(v as TabId),
    [],
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-3xl p-0 gap-0 overflow-hidden"
        showCloseButton
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Account</DialogTitle>
        </DialogHeader>

        <Tabs
          orientation="vertical"
          value={activeTab}
          onValueChange={handleTabChange}
          className="h-[560px]"
        >
          {/* Left sidebar */}
          <TabsList
            variant="line"
            className="w-44 shrink-0 border-r border-border/50 rounded-none h-full! flex flex-col justify-start p-2 gap-0.5"
          >
            <div className="flex items-center gap-2.5 px-2 py-2 mb-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                ZA
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-foreground leading-none truncate">
                  Nightcrawl3r
                </p>
                <span className="text-[10px] text-muted-foreground/50">
                  Basic Plan
                </span>
              </div>
            </div>

            <div className="flex flex-col space-y-0.5 w-full">
              {TABS.map(({ id, label, icon: Icon }) => (
                <TabsTrigger
                  key={id}
                  value={id}
                  className="text-[12.5px] h-8 px-2 rounded-md gap-2 w-full justify-start"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {label}
                </TabsTrigger>
              ))}
            </div>
          </TabsList>

          {/* Content */}
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
});

// ── Export ────────────────────────────────────────────────────────────────

export const AccountDialog = React.memo(function AccountDialog({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileAccountDrawer isOpen={isOpen} onOpenChange={onOpenChange} />;
  }
  return <DesktopAccountDialog isOpen={isOpen} onOpenChange={onOpenChange} />;
});
