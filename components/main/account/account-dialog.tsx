"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { ProfileSection } from "./sections/profile";
import { PlanSection } from "./sections/plan";
import { UsageSection } from "./sections/usage";
import { SecuritySection } from "./sections/security";

interface AccountData {
  profile: {
    id: string;
    email: string;
    name: string;
    createdAt: string;
    isActive: boolean;
  };
  plan: {
    name: string;
    displayName: string;
    credits: number;
    limits: {
      chats: string | number;
      projects: string | number;
      messages: string | number;
    };
    features: string[];
  };
  subscription: {
    active: boolean;
    status?: string;
    periodEnd?: string;
    cancelAtPeriodEnd?: boolean;
  };
  usage: {
    chats: number;
    projects: number;
    messages: number;
    files: number;
  };
  monthlyUsage: {
    chats: number;
    messages: number;
  };
}

async function fetchAccount(): Promise<AccountData> {
  const res = await fetch("/api/account", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch account");
  return res.json();
}

// ---------------------------------------------------------------------------
// Tabs config
// ---------------------------------------------------------------------------

const TABS = [
  { id: "profile", label: "Profile", description: "Name, email & avatar", icon: User },
  { id: "plan", label: "Plan", description: "Billing, credits & features", icon: CreditCard },
  { id: "usage", label: "Usage", description: "Messages, tokens & activity", icon: BarChart2 },
  { id: "security", label: "Security", description: "Password, sessions & 2FA", icon: ShieldCheck },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ---------------------------------------------------------------------------
// Skeletons
// ---------------------------------------------------------------------------

function AccountSidebarSkeleton() {
  return (
    <div className="flex items-center gap-2.5 px-2 py-2 mb-2.5">
      <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
      <div className="min-w-0 space-y-1">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-2 w-14" />
      </div>
    </div>
  );
}

function AccountContentSkeleton() {
  return (
    <div className="space-y-5">
      <div>
        <Skeleton className="h-4 w-24 mb-1" />
        <Skeleton className="h-3 w-48" />
      </div>
      <div className="flex flex-col items-center gap-2 py-2">
        <Skeleton className="h-16 w-16 rounded-full" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="space-y-3">
        <div className="space-y-1">
          <Skeleton className="h-3 w-20 mb-1" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-3 w-16 mb-1" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

function MobileAccountHeaderSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
      <div className="space-y-1">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar header with user info
// ---------------------------------------------------------------------------

interface SidebarHeaderProps {
  data: AccountData | undefined;
  isLoading: boolean;
}

const SidebarHeader = React.memo(function SidebarHeader({ data, isLoading }: SidebarHeaderProps) {
  const name = data?.profile?.name;
  const email = data?.profile?.email;

  if (isLoading && !data) {
    return (
      <div className="flex items-center gap-2.5 px-2 py-2 mb-2.5">
        <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
        <div className="min-w-0 space-y-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-2 w-14" />
        </div>
      </div>
    );
  }

  const initials = name
    ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <div className="flex items-center gap-2.5 px-2 py-2 mb-2.5">
      <div className="h-8 w-8 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium text-foreground truncate">
          {name || "User"}
        </p>
        <p className="text-[11px] text-muted-foreground truncate">
          {email ? email.split("@")[0] : ""}
        </p>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Section renderer
// ---------------------------------------------------------------------------

interface SectionContentProps {
  id: TabId;
  accountData: AccountData | undefined;
  isLoading: boolean;
}

const SectionContent = React.memo(function SectionContent({ id, accountData, isLoading }: SectionContentProps) {
  // Pass accountData directly to sections - no additional fetching needed
  // Parent (DesktopAccountDialog/MobileAccountDrawer) already fetched the data
  const data = accountData;

  switch (id) {
    case "profile":
      return <ProfileSection accountData={data} />;
    case "plan":
      return <PlanSection accountData={data} />;
    case "usage":
      return <UsageSection accountData={data} />;
    case "security":
      return <SecuritySection accountData={data} />;
  }
});

// ---------------------------------------------------------------------------
// Mobile drawer
// ---------------------------------------------------------------------------

interface MobileTabRowProps {
  tab: {
    id: string;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  };
  isLast: boolean;
  onSelect: (id: TabId) => void;
}

const MobileTabRow = React.memo(function MobileTabRow({
  tab,
  isLast,
  onSelect,
}: MobileTabRowProps) {
  const Icon = tab.icon;
  const handleClick = React.useCallback(() => onSelect(tab.id as TabId), [tab.id, onSelect]);

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
        <p className="text-[13.5px] font-semibold text-foreground leading-snug">{tab.label}</p>
        <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">{tab.description}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
    </button>
  );
});

const MobileAccountDrawer = React.memo(function MobileAccountDrawer({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("account");
  const [activeSection, setActiveSection] = React.useState<TabId | null>(null);

  const { data: accountData, isLoading } = useQuery({
    queryKey: ["account"],
    queryFn: fetchAccount,
    staleTime: 30000,
  });

  React.useEffect(() => {
    if (!isOpen) setActiveSection(null);
  }, [isOpen]);

  const handleSelect = React.useCallback((id: TabId) => setActiveSection(id), []);
  const handleBack = React.useCallback(() => setActiveSection(null), []);

  const tabs = [
    { id: "profile" as const, label: t("profile"), description: t("profileDesc"), icon: User },
    { id: "plan" as const, label: t("plan"), description: t("planDesc"), icon: CreditCard },
    { id: "usage" as const, label: t("usage"), description: t("usageDesc"), icon: BarChart2 },
    { id: "security" as const, label: t("security"), description: t("securityDesc"), icon: ShieldCheck },
  ];

  const activeTab = React.useMemo(
    () => (activeSection ? tabs.find((t) => t.id === activeSection) : null),
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
              <DrawerTitle className="text-[14px]">{activeTab?.label}</DrawerTitle>
            </div>
          ) : (
            <SidebarHeader data={accountData} isLoading={isLoading} />
          )}
        </DrawerHeader>

        {activeSection ? (
          <ScrollArea className="flex-1 min-h-0">
            <div className="px-5 py-4 pb-6">
              <SectionContent id={activeSection} accountData={accountData} isLoading={isLoading} />
            </div>
          </ScrollArea>
        ) : (
          <ScrollArea className="flex-1 min-h-0">
            <div className="py-2 pb-4">
              {tabs.map((tab, i) => (
                <MobileTabRow key={tab.id} tab={tab} isLast={i === tabs.length - 1} onSelect={handleSelect} />
              ))}
            </div>
          </ScrollArea>
        )}
      </DrawerContent>
    </Drawer>
  );
});

// ---------------------------------------------------------------------------
// Desktop dialog
// ---------------------------------------------------------------------------

const DesktopAccountDialog = React.memo(function DesktopAccountDialog({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("account");
  const [activeTab, setActiveTab] = React.useState<TabId>("profile");

  const { data: accountData, isLoading } = useQuery({
    queryKey: ["account"],
    queryFn: fetchAccount,
    staleTime: 30000,
  });

  const handleTabChange = React.useCallback((v: string) => setActiveTab(v as TabId), []);

  const tabs = [
    { id: "profile" as const, label: t("profile"), icon: User },
    { id: "plan" as const, label: t("plan"), icon: CreditCard },
    { id: "usage" as const, label: t("usage"), icon: BarChart2 },
    { id: "security" as const, label: t("security"), icon: ShieldCheck },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl p-0 gap-0 overflow-hidden" showCloseButton>
        <DialogHeader className="sr-only">
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>

        <Tabs orientation="vertical" value={activeTab} onValueChange={handleTabChange} className="h-[560px]">
          <TabsList
            variant="line"
            className="w-44 shrink-0 border-r border-border/50 rounded-none h-full! flex flex-col justify-start p-2 gap-0.5"
          >
            <SidebarHeader data={accountData} isLoading={isLoading} />

            <div className="flex flex-col space-y-0.5 w-full">
              {tabs.map(({ id, label, icon: Icon }) => (
                <TabsTrigger key={id} value={id} className="text-[12.5px] h-8 px-2 rounded-md gap-2 w-full justify-start">
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {label}
                </TabsTrigger>
              ))}
            </div>
          </TabsList>

          <ScrollArea className="flex-1 hide-scrollbar">
            <div className="p-5">
              {tabs.map(({ id }) => (
                <TabsContent key={id} value={id}>
                  <SectionContent id={id} accountData={accountData} isLoading={isLoading} />
                </TabsContent>
              ))}
            </div>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
});

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

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
