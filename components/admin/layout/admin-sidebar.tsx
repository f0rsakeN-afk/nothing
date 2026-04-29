"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  Users,
  FileText,
  ScrollText,
  Inbox,
  Bell,
  MessageSquare,
  Folder,
  File,
  Brain,
  Server,
  Mail,
  AlertTriangle,
  CreditCard,
  PanelLeft,
  LogOut,
  Sun,
  Radio,
  Settings2,
  Moon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser } from "@stackframe/stack";
import { cn } from "@/lib/utils";
import { SidebarToggleIcon } from "@/src/components/unlumen-ui/sidebar-toggle-icon";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/changelog", label: "Changelog", icon: FileText },
  { href: "/admin/inbox", label: "Inbox", icon: Inbox },
  { href: "/admin/chats", label: "Chats", icon: MessageSquare },
  { href: "/admin/projects", label: "Projects", icon: Folder },
  { href: "/admin/files", label: "Files", icon: File },
  { href: "/admin/memories", label: "Memories", icon: Brain },
  { href: "/admin/mcp-servers", label: "MCP Servers", icon: Server },
  { href: "/admin/invitations", label: "Invitations", icon: Mail },
  { href: "/admin/incidents", label: "Incidents", icon: AlertTriangle },
  { href: "/admin/push", label: "Push Subs", icon: Bell },
  { href: "/admin/audit", label: "Audit Log", icon: ScrollText },
  { href: "/admin/notifications", label: "Notifications", icon: Radio },
  { href: "/admin/settings", label: "Settings", icon: Settings2 },
  { href: "/admin/plans", label: "Plans", icon: CreditCard },
];

function AdminNav() {
  const pathname = usePathname();
  const { state } = useSidebar();

  return (
    <SidebarMenu>
      {navItems.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);

        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              render={
                <Link href={item.href} className="flex items-center gap-2" />
              }
              isActive={isActive}
              tooltip={state === "collapsed" ? item.label : undefined}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

function AdminSidebarHeader() {
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <SidebarHeader className={cn("gap-0", isCollapsed ? "p-2" : "p-3")}>
      <div
        className={cn(
          "flex items-center",
          isCollapsed ? "justify-center" : "justify-between gap-2",
        )}
      >
        {isCollapsed ? (
          <button
            onClick={toggleSidebar}
            className="group/logo flex items-center gap-2 shrink-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring cursor-pointer"
            aria-label="Open sidebar"
          >
            <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-sidebar-primary-foreground group-hover/logo:text-sidebar-accent-foreground">
              <Image
                src={"/logo.png"}
                alt="eryx logo"
                height={20}
                width={20}
                priority
                className="dark:invert transition-opacity duration-150 group-hover/logo:opacity-0"
              />
              <PanelLeft className="absolute h-3.5 w-3.5 opacity-0 transition-opacity duration-150 group-hover/logo:opacity-100" />
            </span>
          </button>
        ) : (
          <Link
            href="/"
            className="flex items-center gap-2 shrink-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            <Image
              src={"/logo.png"}
              alt="eryx logo"
              height={20}
              width={20}
              priority
              className="dark:invert"
            />
            {/* <span className="text-sm font-semibold text-foreground tracking-tight">Admin</span> */}
          </Link>
        )}

        {!isCollapsed && (
          <button
            onClick={toggleSidebar}
            className="h-7 w-7 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent flex items-center justify-center rounded-md"
            aria-label="Close sidebar"
          >
            <SidebarToggleIcon isOpen={false} />
          </button>
        )}
      </div>
    </SidebarHeader>
  );
}

export function AdminSidebar() {
  const { state } = useSidebar();
  const user = useUser();
  const { theme, setTheme } = useTheme();
  const isCollapsed = state === "collapsed";

  const toggleTheme = React.useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light");
  }, [theme, setTheme]);

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <AdminSidebarHeader />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <AdminNav />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator className="ml-0" />

      <SidebarFooter className="gap-1.5 p-2">
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                "flex flex-1 items-center gap-2 rounded-md text-left outline-none cursor-pointer",
                isCollapsed ? "h-8 w-8 justify-center p-0" : "h-12 px-2",
              )}
            >
              <Avatar>
                <AvatarImage
                  src={user.profileImageUrl || ""}
                  alt="admin profile"
                />
                <AvatarFallback>
                  {user.displayName?.charAt(0) || "A"}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-semibold tracking-wide text-sidebar-foreground leading-none mb-1">
                    {user.displayName || "Admin"}
                  </p>
                  <span className="inline-flex items-center rounded-full bg-sidebar-accent/50 px-1.5 py-0.5 text-[9.5px] font-medium text-sidebar-foreground/50 tracking-wide">
                    Admin
                  </span>
                </div>
              )}
            </DropdownMenuTrigger>

            <DropdownMenuContent
              side="top"
              align="start"
              sideOffset={8}
              className="w-60"
            >
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60 px-2 py-1.5">
                  Admin
                </DropdownMenuLabel>
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
                <DropdownMenuItem className="gap-2.5 text-[13px] cursor-pointer">
                  <Link href="/" className="flex items-center gap-2 w-full">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      className="shrink-0"
                    >
                      <path
                        d="M10 12L6 8l4-4"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Back to app
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                variant="destructive"
                className="gap-2.5 text-[13px] cursor-pointer"
                onClick={() => {
                  user.signOut().then(() => {
                    window.location.href = "/";
                  });
                }}
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
