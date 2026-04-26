"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import {
  ChevronUp,
  Settings,
  Wand2,
  Home,
  FileText,
  ShieldCheck,
  LogOut,
  Crown,
  Sun,
  Moon,
  MessageSquare,
  UserCircle,
  Keyboard,
  LogIn,
  Bug,
  Globe,
} from "lucide-react";

import {
  SidebarFooter,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

const PricingDialog = dynamic(
  () =>
    import("./dialogs/pricing/pricing-dialog").then((mod) => mod.PricingDialog),
  { ssr: false },
);
const AccountDialog = dynamic(
  () =>
    import("@/components/main/account/account-dialog").then(
      (mod) => mod.AccountDialog,
    ),
  { ssr: false },
);
const ShortcutsDialog = dynamic(
  () => import("./dialogs/shortcuts-dialog").then((mod) => mod.ShortcutsDialog),
  { ssr: false },
);
const LogoutDialog = dynamic(
  () => import("./dialogs/auth/logout-dialog").then((mod) => mod.LogoutDialog),
  { ssr: false },
);
const AuthDialog = dynamic(
  () => import("./dialogs/auth/auth-dialog").then((mod) => mod.AuthDialog),
  { ssr: false },
);
const SettingsDialog = dynamic(
  () =>
    import("@/components/main/settings/settings-dialog").then(
      (mod) => mod.SettingsDialog,
    ),
  { ssr: false },
);
const FeedbackDialog = dynamic(
  () =>
    import("@/components/feedback/feedback-dialog").then(
      (mod) => mod.FeedbackDialog,
    ),
  { ssr: false },
);
const CustomizeDialog = dynamic(
  () =>
    import("@/components/customize/customize-dialog").then(
      (mod) => mod.CustomizeDialog,
    ),
  { ssr: false },
);
const ReportDialog = dynamic(
  () =>
    import("@/components/report/report-dialog").then((mod) => mod.ReportDialog),
  { ssr: false },
);
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";
import { useStackApp, useUser } from "@stackframe/stack";
import { useQuery } from "@tanstack/react-query";
import { routing } from "@/routing";
import { NotificationsButton } from "@/components/main/header/notifications-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useHaptics } from "@/hooks/use-web-haptics";

export function AppSidebarFooter() {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const { state } = useSidebar();
  const user = useUser();
  const app = useStackApp();
  const { theme, setTheme } = useTheme();
  const { trigger } = useHaptics();
  const [feedbackOpen, setFeedbackOpen] = React.useState<boolean>(false);
  const [customizeOpen, setCustomizeOpen] = React.useState<boolean>(false);
  const [pricingDialogOpen, setPricingDialogOpen] =
    React.useState<boolean>(false);
  const [logoutAlertOpen, setLogoutAlertOpen] = React.useState<boolean>(false);
  const [authDialogOpen, setAuthDialogOpen] = React.useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = React.useState<boolean>(false);
  const [accountOpen, setAccountOpen] = React.useState<boolean>(false);
  const [shortcutsOpen, setShortcutsOpen] = React.useState<boolean>(false);
  const [reportOpen, setReportOpen] = React.useState<boolean>(false);
  const isCollapsed = state === "collapsed";

  // Fetch user plan info
  const { data: accountData } = useQuery({
    queryKey: ["account"],
    queryFn: async () => {
      const res = await fetch("/api/account");
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user,
  });

  const planName = accountData?.plan?.displayName || "Free";

  const toggleTheme = React.useCallback(() => {
    trigger("success");
    setTheme(theme === "light" ? "dark" : "light");
  }, [theme, setTheme, trigger]);

  const switchLocale = React.useCallback((locale: string) => {
    // Set cookie for persistence
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`;

    // Update user settings in database
    fetch("/api/settings/locale", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: locale }),
    }).catch(() => {});

    // Full page reload to force re-render with new locale
    window.location.reload();
  }, []);

  const createLocaleHandler = React.useCallback(
    (locale: string) => () => {
      trigger("success");
      switchLocale(locale);
    },
    [switchLocale, trigger],
  );

  const openSettings = React.useCallback(() => setSettingsOpen(true), []);
  const openAccount = React.useCallback(() => setAccountOpen(true), []);
  const openCustomize = React.useCallback(() => setCustomizeOpen(true), []);
  const openPricing = React.useCallback(() => setPricingDialogOpen(true), []);
  const openFeedback = React.useCallback(() => setFeedbackOpen(true), []);
  const openLogout = React.useCallback(() => setLogoutAlertOpen(true), []);
  const openAuth = React.useCallback(() => setAuthDialogOpen(true), []);
  const openShortcuts = React.useCallback(() => setShortcutsOpen(true), []);
  const openReport = React.useCallback(() => setReportOpen(true), []);

  // ── Global keyboard shortcuts ──────────────────────────────────────────
  useKeyboardShortcut(",", openSettings, {
    meta: true,
    disableOnDialog: true,
    enabled: !!user,
  });
  useKeyboardShortcut(",", openSettings, {
    ctrl: true,
    disableOnDialog: true,
    enabled: !!user,
  });
  useKeyboardShortcut("a", openAccount, {
    meta: true,
    shift: true,
    disableOnDialog: true,
    enabled: !!user,
  });
  useKeyboardShortcut("a", openAccount, {
    ctrl: true,
    shift: true,
    disableOnDialog: true,
    enabled: !!user,
  });
  useKeyboardShortcut("f", openFeedback, {
    meta: true,
    shift: true,
    disableOnDialog: true,
    enabled: !!user,
  });
  useKeyboardShortcut("f", openFeedback, {
    ctrl: true,
    shift: true,
    disableOnDialog: true,
    enabled: !!user,
  });
  useKeyboardShortcut("?", openShortcuts, {
    disableOnDialog: true,
    enabled: !!user,
  });

  const goToLanding = React.useCallback(() => router.push("/about"), [router]);
  const openTerms = React.useCallback(
    () => window.open("/legal/terms", "_blank"),
    [],
  );
  const openPolicy = React.useCallback(
    () => window.open("/legal/policy", "_blank"),
    [],
  );

  return (
    <>
      <SidebarSeparator className={"ml-0"} />

      <SidebarFooter className="gap-1.5 p-2">
        {user && (
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "flex flex-1 items-center gap-2 rounded-md text-left outline-none cursor-pointer",
                  "",
                  isCollapsed ? "h-8 w-8 justify-center p-0" : "h-12 px-2",
                )}
              >
                {/* <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground text-[11px] font-bold">
                  {user?.displayName?.charAt(0) || "Z"}
                </div> */}

                <Avatar>
                  <AvatarImage
                    src={(user && user?.profileImageUrl) || ""}
                    alt="user profile image"
                  />
                  <AvatarFallback>
                    {" "}
                    {user?.displayName?.charAt(0) || "Z"}
                  </AvatarFallback>
                </Avatar>
                {!isCollapsed && (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-semibold tracking-wide text-sidebar-foreground leading-none mb-1">
                        {user.displayName || "Unnamed User"}
                      </p>
                      {/* <span className="inline-flex items-center rounded-full bg-sidebar-accent/50 px-1.5 py-0.5 text-[9.5px] font-medium text-sidebar-foreground/50 tracking-wide">
                        {planName}
                      </span> */}
                    </div>
                    {/* <ChevronUp className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/30" /> */}
                  </>
                )}
              </DropdownMenuTrigger>

              <DropdownMenuContent
                side="top"
                align="start"
                sideOffset={8}
                className="sm:w-60"
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60 px-2 py-1.5">
                    {t("sidebar.accountDetails")}
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    className="gap-2.5 text-[13px] cursor-pointer"
                    onClick={openAccount}
                  >
                    <UserCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    {t("sidebar.accountDetails")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="gap-2.5 text-[13px] cursor-pointer"
                    onClick={openSettings}
                  >
                    <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                    {t("sidebar.settings")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="gap-2.5 text-[13px] cursor-pointer"
                    onClick={openCustomize}
                  >
                    <Wand2 className="h-3.5 w-3.5 text-muted-foreground" />
                    {t("sidebar.customizeAi")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="gap-2.5 text-[13px] cursor-pointer"
                    onClick={openShortcuts}
                  >
                    <Keyboard className="h-3.5 w-3.5 text-muted-foreground" />
                    {t("sidebar.keyboardShortcuts")}
                    <span className="ml-auto text-[10px] text-muted-foreground/50 font-mono">
                      ?
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="gap-2.5 text-[13px] cursor-pointer"
                    onClick={toggleTheme}
                  >
                    {theme === "light" ? (
                      <Moon className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <Sun className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    {theme === "light"
                      ? t("sidebar.darkMode")
                      : t("sidebar.lightMode")}
                  </DropdownMenuItem>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="gap-2.5 text-[13px] cursor-pointer">
                      <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                      {t("settings.language")}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent className="min-w-[140px]">
                        <DropdownMenuItem
                          className="gap-2.5 text-[13px] cursor-pointer"
                          onClick={createLocaleHandler("en")}
                        >
                          <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                          {t("settings.languageEn")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2.5 text-[13px] cursor-pointer"
                          onClick={createLocaleHandler("es")}
                        >
                          <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                          {t("settings.languageEs")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2.5 text-[13px] cursor-pointer"
                          onClick={createLocaleHandler("fr")}
                        >
                          <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                          {t("settings.languageFr")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2.5 text-[13px] cursor-pointer"
                          onClick={createLocaleHandler("ne")}
                        >
                          <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                          {t("settings.languageNe")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2.5 text-[13px] cursor-pointer"
                          onClick={createLocaleHandler("hi")}
                        >
                          <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                          {t("settings.languageHi")}
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60 px-2 py-1.5">
                    {t("sidebar.upgradePlan")}
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    className="gap-2.5 text-[13px] cursor-pointer"
                    onClick={openPricing}
                  >
                    <Crown className="h-3.5 w-3.5 text-muted-foreground" />
                    {t("sidebar.upgradeToPro")}
                  </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                <DropdownMenuGroup>
                  <DropdownMenuItem
                    className="gap-2.5 text-[13px] cursor-pointer"
                    onClick={goToLanding}
                  >
                    <Home className="h-3.5 w-3.5 text-muted-foreground" />
                    {t("sidebar.landingPage")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="gap-2.5 text-[13px] cursor-pointer"
                    onClick={openTerms}
                  >
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    {t("sidebar.termsOfService")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="gap-2.5 text-[13px] cursor-pointer"
                    onClick={openPolicy}
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                    {t("sidebar.privacyPolicy")}
                  </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                <DropdownMenuGroup>
                  <DropdownMenuItem
                    className="gap-2.5 text-[13px] cursor-pointer"
                    onClick={openFeedback}
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                    {t("sidebar.sendFeedback")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="gap-2.5 text-[13px] cursor-pointer"
                    onClick={openReport}
                  >
                    <Bug className="h-3.5 w-3.5 text-muted-foreground" />
                    {t("errors.reportIssue")}
                  </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  variant="destructive"
                  className="gap-2.5 text-[13px] cursor-pointer"
                  onClick={openLogout}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  {t("auth.signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
              {!isCollapsed && <NotificationsButton />}
            </DropdownMenu>
          </div>
        )}
        {!user && (
          <Button
            variant="outline"
            onClick={openAuth}
            className={cn(
              "gap-2 items-center justify-center border-sidebar-border bg-transparent text-[13px] font-semibold tracking-wide text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              isCollapsed ? "h-8 w-8 p-0" : "h-9 w-full px-2",
            )}
          >
            <LogIn className="h-4 w-4 shrink-0" />
            {!isCollapsed && t("ai.title")}
          </Button>
        )}
      </SidebarFooter>

      <PricingDialog
        isOpen={pricingDialogOpen}
        onOpenChange={setPricingDialogOpen}
      />
      <AccountDialog isOpen={accountOpen} onOpenChange={setAccountOpen} />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <LogoutDialog open={logoutAlertOpen} onOpenChange={setLogoutAlertOpen} />
      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
      <SettingsDialog isOpen={settingsOpen} onOpenChange={setSettingsOpen} />
      <FeedbackDialog isOpen={feedbackOpen} onOpenChange={setFeedbackOpen} />
      <CustomizeDialog isOpen={customizeOpen} onOpenChange={setCustomizeOpen} />
      <ReportDialog isOpen={reportOpen} onOpenChange={setReportOpen} />
    </>
  );
}
