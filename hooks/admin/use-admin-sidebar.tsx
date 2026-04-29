"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";

const ADMIN_SIDEBAR_COOKIE = "admin_sidebar_state";
const ADMIN_SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

interface AdminSidebarContextValue {
  state: "expanded" | "collapsed";
  collapsed: boolean;
  toggleCollapse: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

const AdminSidebarContext = createContext<AdminSidebarContextValue | null>(null);

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
}

function setCookie(name: string, value: string, maxAge: number) {
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}`;
}

interface AdminSidebarProviderProps {
  children: ReactNode;
}

export function AdminSidebarProvider({ children }: AdminSidebarProviderProps) {
  const [collapsed, setCollapsedState] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = getCookie(ADMIN_SIDEBAR_COOKIE);
    return stored === "collapsed";
  });

  const pathname = usePathname();

  // Reset to expanded when route changes to admin (optional UX choice)
  // Keeping state persistent across routes

  const setCollapsed = useCallback((value: boolean) => {
    setCollapsedState(value);
    setCookie(ADMIN_SIDEBAR_COOKIE, value ? "collapsed" : "expanded", ADMIN_SIDEBAR_COOKIE_MAX_AGE);
  }, []);

  const toggleCollapse = useCallback(() => {
    setCollapsed(!collapsed);
  }, [collapsed, setCollapsed]);

  const state: "expanded" | "collapsed" = collapsed ? "collapsed" : "expanded";

  return (
    <AdminSidebarContext.Provider value={{ state, collapsed, toggleCollapse, setCollapsed }}>
      {children}
    </AdminSidebarContext.Provider>
  );
}

export function useAdminSidebar() {
  const context = useContext(AdminSidebarContext);
  if (!context) {
    throw new Error("useAdminSidebar must be used within AdminSidebarProvider");
  }
  return context;
}