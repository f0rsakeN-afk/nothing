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
import CreateProjectDialog from "./dialogs/projects/create-project";
import RenameProjectModal from "./dialogs/projects/rename-project";
import DeleteProjectModal from "./dialogs/projects/delete-project";

export function AppSidebar() {
  const { state } = useSidebar();
  const [activeTab, setActiveTab] = React.useState<TabId>("chats");
  const [searchOpen, setSearchOpen] = React.useState(false);
  const isCollapsed = state === "collapsed";

  const [createProjectOpen, setCreateProjectOpen] = React.useState(false);
  const [renameProjectOpen, setRenameProjectOpen] = React.useState(false);
  const [deleteProjectOpen, setDeleteProjectOpen] = React.useState(false);
  const [selectedProject, setSelectedProject] = React.useState<{
    id: string;
    name: string;
    description?: string;
  } | null>(null);

  const openSearch = React.useCallback(() => setSearchOpen(true), []);

  const openCreateProject = React.useCallback(() => {
    setCreateProjectOpen(true);
  }, []);

  const openRenameProject = React.useCallback(
    (project: { id: string; name: string; description?: string }) => {
      setSelectedProject(project);
      setRenameProjectOpen(true);
    },
    [],
  );

  const openDeleteProject = React.useCallback(
    (project: { id: string; name: string }) => {
      setSelectedProject(project);
      setDeleteProjectOpen(true);
    },
    [],
  );

  return (
    <>
      <Sidebar collapsible="icon" className="border-r border-sidebar-border">
        <AppSidebarHeader />

        <SidebarContent className="gap-0">
          <SidebarNav onSearchOpen={openSearch} />
          <SidebarTabs activeTab={activeTab} onTabChange={setActiveTab} />
          {!isCollapsed && (
            <SidebarHistory
              activeTab={activeTab}
              onCreateProject={openCreateProject}
              onRenameProject={openRenameProject}
              onDeleteProject={openDeleteProject}
            />
          )}
        </SidebarContent>

        <AppSidebarFooter />
      </Sidebar>

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />

      <CreateProjectDialog
        open={createProjectOpen}
        onClose={setCreateProjectOpen}
      />
      <RenameProjectModal
        open={renameProjectOpen}
        onClose={setRenameProjectOpen}
        project={selectedProject}
      />
      <DeleteProjectModal
        open={deleteProjectOpen}
        onClose={setDeleteProjectOpen}
        project={selectedProject}
      />
    </>
  );
}
