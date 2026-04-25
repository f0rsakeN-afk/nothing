"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

import { Sidebar, SidebarContent, useSidebar } from "@/components/ui/sidebar";
import { AppSidebarHeader } from "./sidebar-header";
import { SidebarNav } from "./sidebar-nav";
import { SidebarTabs } from "./sidebar-tabs";
import { SidebarHistory } from "./sidebar-history";
import { AppSidebarFooter } from "./sidebar-footer";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";
import { type TabId } from "./data";
import { useUser } from "@stackframe/stack";

const SearchDialog = dynamic(
  () => import("./dialogs/search-dialog").then((mod) => mod.SearchDialog),
  { ssr: false }
);

export function AppSidebar() {
  const router = useRouter();
  const { state } = useSidebar();
  const user = useUser();
  const [activeTab, setActiveTab] = React.useState<TabId>("chats");
  const [searchOpen, setSearchOpen] = React.useState(false);
  const isCollapsed = state === "collapsed";

  const openSearch = React.useCallback(() => setSearchOpen(true), []);

  useKeyboardShortcut("k", openSearch, { meta: true, ignoreInputs: false, enabled: !!user });
  useKeyboardShortcut("k", openSearch, { meta: true, ignoreInputs: false, enabled: !!user });

  const createNewChat = React.useCallback(() => {
    router.push("/home");
  }, [router]);

  useKeyboardShortcut("n", createNewChat, { meta: true, shift: true, ignoreInputs: true, disableOnDialog: true, enabled: !!user });
  useKeyboardShortcut("n", createNewChat, { meta: true, shift: true, ignoreInputs: true, disableOnDialog: true, enabled: !!user });

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <AppSidebarHeader />

      <SidebarContent className="gap-0">
        <SidebarNav onSearchOpen={openSearch} />
        {user && (
          <>
            <SidebarTabs activeTab={activeTab} onTabChange={setActiveTab} />
            {!isCollapsed && (
              <SidebarHistory activeTab={activeTab} />
            )}
          </>
        )}
      </SidebarContent>

      <AppSidebarFooter />

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </Sidebar>
  );
}
