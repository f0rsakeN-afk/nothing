import { cookies } from "next/headers";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/main/sidebar/app-sidebar";
import { InitUser } from "@/components/init-user";
import { ProjectDialogsProvider } from "@/components/main/sidebar/dialogs/projects/project-dialogs-provider";
import { AuthGuard } from "@/components/main/auth-guard";
import { AuthStatusProvider } from "@/components/main/auth-status-provider";
import { MobileHeader } from "@/components/main/layout/mobile-header";
import "../../styles/hide-scrollbar.css";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      className="h-svh overflow-hidden"
    >
      <ProjectDialogsProvider>
        <AppSidebar />
        <SidebarInset className="min-h-0 overflow-hidden">
          {/* Mobile top bar */}
          <MobileHeader />

          <InitUser />
          <AuthStatusProvider>
            <AuthGuard>{children}</AuthGuard>
          </AuthStatusProvider>
        </SidebarInset>
      </ProjectDialogsProvider>
    </SidebarProvider>
  );
}
