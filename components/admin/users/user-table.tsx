"use client";

import Link from "next/link";
import { useMemo, useCallback, memo } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  email: string;
  role: "USER" | "MODERATOR" | "ADMIN";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  planTier: "FREE" | "BASIC" | "PRO" | "ENTERPRISE";
  credits: number;
  _count: {
    chats: number;
    projects: number;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

interface UserFiltersProps {
  search: string;
  role: string;
  isActive: string;
  total: number;
  onSearchChange: (value: string) => void;
  onRoleChange: (value: string) => void;
  onActiveChange: (value: string) => void;
}

const UserFilters = memo(function UserFilters({
  search,
  role,
  isActive,
  total,
  onSearchChange,
  onRoleChange,
  onActiveChange,
}: UserFiltersProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="relative w-64">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by email or ID..."
          className="pl-8"
        />
      </div>

      <Select value={role} onValueChange={(v) => onRoleChange(v || "")}>
        <SelectTrigger className="h-10 w-[140px]">
          <SelectValue placeholder="All Roles" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Roles</SelectItem>
          <SelectItem value="USER">User</SelectItem>
          <SelectItem value="MODERATOR">Moderator</SelectItem>
          <SelectItem value="ADMIN">Admin</SelectItem>
        </SelectContent>
      </Select>

      <Select value={isActive} onValueChange={(v) => onActiveChange(v || "")}>
        <SelectTrigger className="h-10 w-[120px]">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Status</SelectItem>
          <SelectItem value="true">Active</SelectItem>
          <SelectItem value="false">Inactive</SelectItem>
        </SelectContent>
      </Select>

      <span className="text-sm text-muted-foreground ml-auto">
        {total.toLocaleString()} user{total !== 1 ? "s" : ""}
      </span>
    </div>
  );
});

interface UserRowProps {
  user: User;
}

const ROLE_STYLES: Record<string, string> = {
  ADMIN: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  MODERATOR: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  USER: "bg-muted text-muted-foreground",
};

const PLAN_STYLES: Record<string, string> = {
  ENTERPRISE: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  PRO: "bg-primary/10 text-primary border-primary/20",
  BASIC: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  FREE: "bg-muted text-muted-foreground",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const UserRow = memo(function UserRow({ user }: UserRowProps) {
  return (
    <TableRow>
      <TableCell>
        <Link
          href={`/admin/users/${user.id}`}
          className="flex flex-col gap-0.5 hover:underline"
        >
          <span className="text-sm font-medium truncate max-w-[180px]">
            {user.email.split("@")[0]}
          </span>
          <span className="text-xs text-muted-foreground">{user.email}</span>
        </Link>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={cn("text-xs font-medium", ROLE_STYLES[user.role])}>
          {user.role}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={cn("text-xs font-medium", PLAN_STYLES[user.planTier])}>
          {user.planTier}
        </Badge>
      </TableCell>
      <TableCell>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-xs",
            user.isActive ? "text-green-600 dark:text-green-400" : "text-muted-foreground",
          )}
        >
          <span
            className={cn("h-1.5 w-1.5 rounded-full", user.isActive ? "bg-green-500" : "bg-muted-foreground")}
          />
          {user.isActive ? "Active" : "Inactive"}
        </span>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground tabular-nums">{user._count.chats}</TableCell>
      <TableCell className="text-sm text-muted-foreground tabular-nums">{user._count.projects}</TableCell>
      <TableCell className="text-xs text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
    </TableRow>
  );
});

interface UserTableProps {
  users: User[];
  pagination: Pagination;
  search: string;
  role: string;
  isActive: string;
  onSearchChange: (value: string) => void;
  onRoleChange: (value: string) => void;
  onActiveChange: (value: string) => void;
  onPageChange: (page: number) => void;
}

export function UserTable({
  users,
  pagination,
  search,
  role,
  isActive,
  onSearchChange,
  onRoleChange,
  onActiveChange,
  onPageChange,
}: UserTableProps) {
  const userRows = useMemo(
    () => users.map((user) => <UserRow key={user.id} user={user} />),
    [users],
  );

  const handlePrevPage = useCallback(() => {
    onPageChange(pagination.page - 1);
  }, [pagination.page, onPageChange]);

  const handleNextPage = useCallback(() => {
    onPageChange(pagination.page + 1);
  }, [pagination.page, onPageChange]);

  return (
    <div className="flex flex-col gap-4">
      <UserFilters
        search={search}
        role={role}
        isActive={isActive}
        total={pagination.total}
        onSearchChange={onSearchChange}
        onRoleChange={onRoleChange}
        onActiveChange={onActiveChange}
      />

      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Chats</TableHead>
              <TableHead>Projects</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              userRows
            )}
          </TableBody>
        </Table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevPage}
            disabled={pagination.page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground px-3">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={!pagination.hasMore}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}