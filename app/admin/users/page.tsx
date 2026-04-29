"use client";

import { useState, useCallback, useEffect } from "react";
import { UserTable } from "@/components/admin/users/user-table";
import { useAdminUsers } from "@/hooks/admin/use-admin-users";

export default function UsersPage() {
  // Filter state
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [isActive, setIsActive] = useState("");
  const [page, setPage] = useState(1);

  // Debounced search (only triggers new fetch after 400ms of no typing)
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      if (search !== debouncedSearch) setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search, debouncedSearch]);

  // Build filter params
  const filters = {
    search: debouncedSearch || undefined,
    role: role || undefined,
    isActive: isActive || undefined,
    page,
    limit: 20,
  };

  // React Query fetch
  const { data, isLoading, isError, error, refetch } = useAdminUsers(filters);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const handleRoleChange = useCallback((value: string) => {
    setRole(value);
    setPage(1);
  }, []);

  const handleActiveChange = useCallback((value: string) => {
    setIsActive(value);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Users</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage user accounts, roles, and permissions
        </p>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground">Loading users...</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <svg className="h-5 w-5 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground">
              {error instanceof Error ? error.message : "Failed to load users"}
            </p>
            <button
              onClick={handleRetry}
              className="text-xs text-primary hover:underline"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {!isLoading && !isError && data && (
        <UserTable
          users={data.data}
          pagination={data.pagination}
          search={search}
          role={role}
          isActive={isActive}
          onSearchChange={handleSearchChange}
          onRoleChange={handleRoleChange}
          onActiveChange={handleActiveChange}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}