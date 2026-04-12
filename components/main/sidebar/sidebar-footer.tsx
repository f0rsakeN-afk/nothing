"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
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
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FeedbackDialog } from "@/components/feedback/feedback-dialog";
import { CustomizeDialog } from "@/components/customize/customize-dialog";
import { PricingDialog } from "./dialogs/pricing/pricing-dialog";
import { LogoutDialog } from "./dialogs/auth/logout-dialog";
import { SettingsDialog } from "@/components/main/settings/settings-dialog";
import { AccountDialog } from "@/components/main/account/account-dialog";
import { ShortcutsDialog } from "@/components/main/sidebar/dialogs/shortcuts-dialog";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";
import { useStackApp, useUser } from "@stackframe/stack";
import { useQuery } from "@tanstack/react-query";

export function AppSidebarFooter() {
  const router = useRouter();
  const { state } = useSidebar();
  const user = useUser();
  const app = useStackApp();
  const { theme, setTheme } = useTheme();
  const [feedbackOpen, setFeedbackOpen] = React.useState<boolean>(false);
  const [customizeOpen, setCustomizeOpen] = React.useState<boolean>(false);
  const [pricingDialogOpen, setPricingDialogOpen] =
    React.useState<boolean>(false);
  const [logoutAlertOpen, setLogoutAlertOpen] = React.useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = React.useState<boolean>(false);
  const [accountOpen, setAccountOpen] = React.useState<boolean>(false);
  const [shortcutsOpen, setShortcutsOpen] = React.useState<boolean>(false);
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
    setTheme(theme === "light" ? "dark" : "light");
  }, [theme, setTheme]);

  const openSettings = React.useCallback(() => setSettingsOpen(true), []);
  const openAccount = React.useCallback(() => setAccountOpen(true), []);
  const openCustomize = React.useCallback(() => setCustomizeOpen(true), []);
  const openPricing = React.useCallback(() => setPricingDialogOpen(true), []);
  const openFeedback = React.useCallback(() => setFeedbackOpen(true), []);
  const openLogout = React.useCallback(() => setLogoutAlertOpen(true), []);
  const openShortcuts = React.useCallback(() => setShortcutsOpen(true), []);

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
      <SidebarSeparator />

      <SidebarFooter className="gap-1.5 p-2">
        {user ? (
          <>
            {!isCollapsed && (
              <Button
                variant="outline"
                onClick={openPricing}
                className="h-9 w-full border-sidebar-border bg-transparent text-[13px] font-semibold tracking-wide text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground  "
              >
                Upgrade
              </Button>
            )}
          </>
        ) : (
          <Button
            variant="outline"
            onClick={() => app.redirectToSignIn()}
            className={cn(
              "gap-2 items-center justify-center border-sidebar-border bg-transparent text-[13px] font-semibold tracking-wide text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              isCollapsed ? "h-8 w-8 p-0" : "h-9 w-full px-2",
            )}
          >
            <LogIn className="h-4 w-4 shrink-0" />
            {!isCollapsed && "Eryx AI"}
          </Button>
        )}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                "flex w-full items-center gap-2 rounded-md text-left outline-none  ",
                "hover:bg-sidebar-accent data-popup-open:bg-sidebar-accent",
                isCollapsed ? "h-8 w-8 justify-center p-0" : "h-12 px-2",
              )}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground text-[11px] font-bold">
                Z
              </div>
              {!isCollapsed && (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-semibold tracking-wide text-sidebar-foreground leading-none mb-1">
                      {user.displayName || "Unnamed User"}
                    </p>
                    <span className="inline-flex items-center rounded-full bg-sidebar-accent/50 px-1.5 py-0.5 text-[9.5px] font-medium text-sidebar-foreground/50 tracking-wide">
                      {planName}
                    </span>
                  </div>
                  <ChevronUp className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/30" />
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
                  Account & Details
                </DropdownMenuLabel>
                <DropdownMenuItem
                  className="gap-2.5 text-[13px] cursor-pointer"
                  onClick={openAccount}
                >
                  <UserCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  Account
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2.5 text-[13px] cursor-pointer"
                  onClick={openSettings}
                >
                  <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2.5 text-[13px] cursor-pointer"
                  onClick={openCustomize}
                >
                  <Wand2 className="h-3.5 w-3.5 text-muted-foreground" />
                  Customize AI
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2.5 text-[13px] cursor-pointer"
                  onClick={openShortcuts}
                >
                  <Keyboard className="h-3.5 w-3.5 text-muted-foreground" />
                  Keyboard shortcuts
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
                  {theme === "light" ? "Dark mode" : "Light mode"}
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator />

              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60 px-2 py-1.5">
                  Upgrade Plan
                </DropdownMenuLabel>
                <DropdownMenuItem
                  className="gap-2.5 text-[13px] cursor-pointer"
                  onClick={openPricing}
                >
                  <Crown className="h-3.5 w-3.5 text-muted-foreground" />
                  Upgrade to Pro
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator />

              <DropdownMenuGroup>
                <DropdownMenuItem
                  className="gap-2.5 text-[13px] cursor-pointer"
                  onClick={goToLanding}
                >
                  <Home className="h-3.5 w-3.5 text-muted-foreground" />
                  Landing Page
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2.5 text-[13px] cursor-pointer"
                  onClick={openTerms}
                >
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  Terms of Service
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2.5 text-[13px] cursor-pointer"
                  onClick={openPolicy}
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                  Privacy Policy
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator />

              <DropdownMenuGroup>
                <DropdownMenuItem
                  className="gap-2.5 text-[13px] cursor-pointer"
                  onClick={openFeedback}
                >
                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                  Send Feedback
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                variant="destructive"
                className="gap-2.5 text-[13px] cursor-pointer"
                onClick={openLogout}
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarFooter>

      <PricingDialog
        isOpen={pricingDialogOpen}
        onOpenChange={setPricingDialogOpen}
      />
      <AccountDialog isOpen={accountOpen} onOpenChange={setAccountOpen} />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <LogoutDialog open={logoutAlertOpen} onOpenChange={setLogoutAlertOpen} />
      <SettingsDialog isOpen={settingsOpen} onOpenChange={setSettingsOpen} />
      <FeedbackDialog isOpen={feedbackOpen} onOpenChange={setFeedbackOpen} />
      <CustomizeDialog isOpen={customizeOpen} onOpenChange={setCustomizeOpen} />
    </>
  );
}
