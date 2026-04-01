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
  Flag,
  LogOut,
  Crown,
  Sun,
  Moon,
  MessageSquare,
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
import { ReportDialog } from "@/components/report/report-dialog";
import { FeedbackDialog } from "@/components/feedback/feedback-dialog";
import { CustomizeDialog } from "@/components/customize/customize-dialog";
import { PricingDialog } from "./dialogs/pricing/pricing-dialog";
import { LogoutDialog } from "./dialogs/auth/logout-dialog";
import { SettingsDialog } from "@/components/main/settings/settings-dialog";

export function AppSidebarFooter() {
  const router = useRouter();
  const { state } = useSidebar();
  const { theme, setTheme } = useTheme();
  const [reportOpen, setReportOpen] = React.useState<boolean>(false);
  const [feedbackOpen, setFeedbackOpen] = React.useState<boolean>(false);
  const [customizeOpen, setCustomizeOpen] = React.useState<boolean>(false);
  const [pricingDialogOpen, setPricingDialogOpen] =
    React.useState<boolean>(false);
  const [logoutAlertOpen, setLogoutAlertOpen] = React.useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = React.useState<boolean>(false);
  const isCollapsed = state === "collapsed";

  const toggleTheme = React.useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light");
  }, [theme, setTheme]);

  const openSettings = React.useCallback(() => setSettingsOpen(true), []);
  const openCustomize = React.useCallback(() => setCustomizeOpen(true), []);
  const openPricing = React.useCallback(() => setPricingDialogOpen(true), []);
  const openFeedback = React.useCallback(() => setFeedbackOpen(true), []);
  const openReport = React.useCallback(() => setReportOpen(true), []);
  const openLogout = React.useCallback(() => setLogoutAlertOpen(true), []);

  const goToLanding = React.useCallback(() => router.push("/"), [router]);
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
        {!isCollapsed && (
          <Button
            variant="outline"
            onClick={openPricing}
            className="h-9 w-full border-sidebar-border bg-transparent text-[13px] font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground  "
          >
            Upgrade
          </Button>
        )}

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
                  <p className="text-[12.5px] font-medium text-sidebar-foreground leading-none mb-1">
                    Nightcrawl3r
                  </p>
                  <span className="inline-flex items-center rounded-full bg-sidebar-accent/50 px-1.5 py-0.5 text-[9.5px] font-medium text-sidebar-foreground/50 tracking-wide">
                    Basic
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
              <DropdownMenuItem
                className="gap-2.5 text-[13px] cursor-pointer"
                onClick={openReport}
              >
                <Flag className="h-3.5 w-3.5 text-muted-foreground" />
                Report an Issue
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
      </SidebarFooter>

      <PricingDialog
        isOpen={pricingDialogOpen}
        onOpenChange={setPricingDialogOpen}
      />
      <LogoutDialog open={logoutAlertOpen} onOpenChange={setLogoutAlertOpen} />
      <SettingsDialog isOpen={settingsOpen} onOpenChange={setSettingsOpen} />
      <ReportDialog isOpen={reportOpen} onOpenChange={setReportOpen} />
      <FeedbackDialog isOpen={feedbackOpen} onOpenChange={setFeedbackOpen} />
      <CustomizeDialog isOpen={customizeOpen} onOpenChange={setCustomizeOpen} />
    </>
  );
}
