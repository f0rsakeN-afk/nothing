import { cookies } from "next/headers";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/main/sidebar/app-sidebar";
import "../../styles/hide-scrollbar.css";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      <SidebarInset>
        {/* Top bar — only shown on mobile (desktop has trigger inside sidebar) */}
        <header className="flex h-12 items-center gap-2 border-b border-border px-4 md:hidden">
          <SidebarTrigger className="-ml-1" />
          <span className="text-sm font-medium text-foreground">Eryx</span>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
