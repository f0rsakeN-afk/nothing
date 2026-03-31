"use client";

import * as React from "react";

import { Sidebar, SidebarContent, useSidebar } from "@/components/ui/sidebar";
import { AppSidebarHeader } from "./sidebar-header";
import { SidebarNav } from "./sidebar-nav";
import { SidebarTabs } from "./sidebar-tabs";
import { SidebarHistory } from "./sidebar-history";
import { AppSidebarFooter } from "./sidebar-footer";
import { SearchDialog } from "./dialogs/search-dialog";
import { type TabId } from "./data";

export function AppSidebar() {
  const { state } = useSidebar();
  const [activeTab, setActiveTab] = React.useState<TabId>("chats");
  const [searchOpen, setSearchOpen] = React.useState(false);
  const isCollapsed = state === "collapsed";

  const openSearch = React.useCallback(() => setSearchOpen(true), []);

  return (
    <>
      <Sidebar collapsible="icon" className="border-r border-sidebar-border">
        <AppSidebarHeader />

        <SidebarContent className="gap-0">
          <SidebarNav onSearchOpen={openSearch} />
          <SidebarTabs activeTab={activeTab} onTabChange={setActiveTab} />
          {!isCollapsed && <SidebarHistory activeTab={activeTab} />}
        </SidebarContent>

        <AppSidebarFooter />
      </Sidebar>

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
