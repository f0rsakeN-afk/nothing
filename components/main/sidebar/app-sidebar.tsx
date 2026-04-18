"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Sidebar, SidebarContent, useSidebar } from "@/components/ui/sidebar";
import { AppSidebarHeader } from "./sidebar-header";
import { SidebarNav } from "./sidebar-nav";
import { SidebarTabs } from "./sidebar-tabs";
import { SidebarHistory } from "./sidebar-history";
import { AppSidebarFooter } from "./sidebar-footer";
import { SearchDialog } from "./dialogs/search-dialog";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";
import { type TabId } from "./data";
import CreateProjectDialog from "./dialogs/projects/create-project";
import RenameProjectModal from "./dialogs/projects/rename-project";
import DeleteProjectModal from "./dialogs/projects/delete-project";
import { useUser } from "@stackframe/stack";
import { CreateProjectDialogProvider } from "./dialogs/projects/create-project-context";

export function AppSidebar() {
  const router = useRouter();
  const { state } = useSidebar();
  const user = useUser();
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

  useKeyboardShortcut("k", openSearch, { meta: true, ignoreInputs: false, enabled: !!user });
  useKeyboardShortcut("k", openSearch, { ctrl: true, ignoreInputs: false, enabled: !!user });

  const createNewChat = React.useCallback(() => {
    router.push("/home");
  }, [router]);

  useKeyboardShortcut("n", createNewChat, { meta: true, shift: true, ignoreInputs: true, disableOnDialog: true, enabled: !!user });
  useKeyboardShortcut("n", createNewChat, { ctrl: true, shift: true, ignoreInputs: true, disableOnDialog: true, enabled: !!user });

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
    <CreateProjectDialogProvider onOpenCreateProject={openCreateProject}>
      <Sidebar collapsible="icon" className="border-r border-sidebar-border">
        <AppSidebarHeader />

        <SidebarContent className="gap-0">
          <SidebarNav onSearchOpen={openSearch} />
          {user && (
            <>
              <SidebarTabs activeTab={activeTab} onTabChange={setActiveTab} />
              {!isCollapsed && (
                <SidebarHistory
                  activeTab={activeTab}
                  onCreateProject={openCreateProject}
                  onRenameProject={openRenameProject}
                  onDeleteProject={openDeleteProject}
                />
              )}
            </>
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
    </CreateProjectDialogProvider>
  );
}
