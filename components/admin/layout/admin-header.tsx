"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, LogOut, User } from "lucide-react";

const pathLabels: Record<string, string> = {
  admin: "Dashboard",
  users: "Users",
  changelog: "Changelog",
  audit: "Audit Log",
  notifications: "Notifications",
};

interface BreadcrumbItem {
  label: string;
  href?: string;
}

function getBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const parts = pathname.split("/").filter(Boolean);
  const items: BreadcrumbItem[] = [{ label: "Admin", href: "/admin" }];

  if (parts.length <= 1) return items;

  const current = parts[parts.length - 1];
  const label = pathLabels[current] || current;
  items.push({ label });

  return items;
}

interface AdminHeaderProps {
  sidebarCollapsed: boolean;
}

export function AdminHeader({ sidebarCollapsed }: AdminHeaderProps) {
  const pathname = usePathname();
  const breadcrumbs = getBreadcrumbs(pathname);

  return (
    <header
      className="h-16 border-b border-border bg-background/90 backdrop-blur-md sticky top-0 z-10 flex items-center shrink-0"
      style={{ marginLeft: sidebarCollapsed ? "4rem" : "14rem" }}
    >
      <div className="flex items-center justify-between w-full px-6">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1.5 text-sm">
          {breadcrumbs.map((item, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />}
              {item.href ? (
                <Link
                  href={item.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-foreground font-medium">{item.label}</span>
              )}
            </span>
          ))}
        </nav>

        {/* User menu placeholder */}
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
          <span className="text-sm font-medium text-foreground hidden sm:block">Admin</span>
          <button
            className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}