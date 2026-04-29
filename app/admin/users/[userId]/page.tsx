"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { toast } from "@/components/ui/sileo-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  User,
  Mail,
  Shield,
  CreditCard,
  Calendar,
  MessageSquare,
  Folder,
  File,
  Brain,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";

interface UserDetail {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  planTier: string;
  credits: number;
  seenOnboarding: boolean;
  _count: {
    chats: number;
    projects: number;
    reports: number;
    feedbacks: number;
  };
  subscription?: {
    status: string;
    currentPeriodEnd: string;
    planName: string;
  } | null;
}

async function getUser(userId: string): Promise<{ user: UserDetail }> {
  const res = await fetch(`/api/admin/users/${userId}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to fetch user");
  }
  return res.json();
}

async function updateUser(userId: string, data: { role?: string; isActive?: boolean }) {
  const res = await fetch(`/api/admin/users/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to update user");
  }
  return res.json();
}

const ROLE_CONFIG: Record<string, { label: string; color: string }> = {
  USER: { label: "User", color: "bg-muted text-muted-foreground" },
  MODERATOR: { label: "Moderator", color: "bg-blue-500/10 text-blue-600" },
  ADMIN: { label: "Admin", color: "bg-purple-500/10 text-purple-600" },
};

const PLAN_CONFIG: Record<string, { label: string; color: string }> = {
  FREE: { label: "Free", color: "bg-muted text-muted-foreground" },
  BASIC: { label: "Basic", color: "bg-blue-500/10 text-blue-600" },
  PRO: { label: "Pro", color: "bg-purple-500/10 text-purple-600" },
  ENTERPRISE: { label: "Enterprise", color: "bg-yellow-500/10 text-yellow-600" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;
  const queryClient = useQueryClient();

  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "user", userId],
    queryFn: () => getUser(userId),
    enabled: !!userId,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });

  const updateMutation = useMutation({
    mutationFn: (data: { role?: string; isActive?: boolean }) => updateUser(userId, data),
    onSuccess: () => {
      toast.success("User updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "user", userId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      setRoleDialogOpen(false);
    },
    onError: (err: Error) => {
      toast.error("Failed to update", { description: err.message });
    },
  });

  const handleRoleUpdate = useCallback(() => {
    if (newRole) updateMutation.mutate({ role: newRole });
  }, [newRole, updateMutation]);

  const handleToggleActive = useCallback(() => {
    if (!data?.user) return;
    updateMutation.mutate({ isActive: !data.user.isActive });
  }, [data, updateMutation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (isError || !data?.user) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-sm font-medium text-destructive">Failed to load user</p>
        <Button variant="outline" onClick={() => refetch()}>Try again</Button>
      </div>
    );
  }

  const user = data.user;
  const roleConfig = ROLE_CONFIG[user.role] || ROLE_CONFIG.USER;
  const planConfig = PLAN_CONFIG[user.planTier] || PLAN_CONFIG.FREE;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/users")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Users
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1 rounded-xl border border-border p-6">
          <div className="flex flex-col items-center text-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <User className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">{user.email}</h2>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className={roleConfig.color}>{roleConfig.label}</Badge>
              <Badge variant="outline" className={planConfig.color}>{planConfig.label}</Badge>
            </div>
            <div className="mt-2">
              {user.isActive ? (
                <Badge className="bg-green-500/10 text-green-600">Active</Badge>
              ) : (
                <Badge variant="destructive">Deactivated</Badge>
              )}
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <Mail className="h-4 w-4" /> Email
              </span>
              <span className="text-right break-all">{user.email}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4" /> Credits
              </span>
              <span>{user.credits}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Created
              </span>
              <span>{formatDate(user.createdAt)}</span>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => { setNewRole(user.role); setRoleDialogOpen(true); }}
            >
              <Shield className="h-4 w-4" />
              Change Role
            </Button>
            <Button
              variant={user.isActive ? "destructive" : "default"}
              className="w-full gap-2"
              onClick={handleToggleActive}
              disabled={updateMutation.isPending}
            >
              {user.isActive ? (
                <>
                  <XCircle className="h-4 w-4" />
                  Deactivate User
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Reactivate User
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Stats & Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <MessageSquare className="h-4 w-4" />
                <span className="text-xs">Chats</span>
              </div>
              <p className="text-2xl font-semibold">{user._count.chats}</p>
            </div>
            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Folder className="h-4 w-4" />
                <span className="text-xs">Projects</span>
              </div>
              <p className="text-2xl font-semibold">{user._count.projects}</p>
            </div>
            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <File className="h-4 w-4" />
                <span className="text-xs">Reports</span>
              </div>
              <p className="text-2xl font-semibold">{user._count.reports}</p>
            </div>
            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Brain className="h-4 w-4" />
                <span className="text-xs">Feedback</span>
              </div>
              <p className="text-2xl font-semibold">{user._count.feedbacks}</p>
            </div>
          </div>

          {/* Subscription */}
          {user.subscription && (
            <div className="rounded-xl border border-border p-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-4">Subscription</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Plan</p>
                  <p className="text-sm font-medium">{user.subscription.planName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge className={
                    user.subscription.status === "ACTIVE" ? "bg-green-500/10 text-green-600" :
                    user.subscription.status === "CANCELED" ? "bg-red-500/10 text-red-600" :
                    "bg-muted text-muted-foreground"
                  }>
                    {user.subscription.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Renews</p>
                  <p className="text-sm font-medium">{formatDate(user.subscription.currentPeriodEnd)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Account Info */}
          <div className="rounded-xl border border-border p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Account Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">User ID</p>
                <p className="text-sm font-mono">{user.id}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Onboarding Completed</p>
                <p className="text-sm">{user.seenOnboarding ? "Yes" : "No"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Last Updated</p>
                <p className="text-sm">{formatDate(user.updatedAt)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Role Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>Update the role for this user</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={newRole} onValueChange={(v) => setNewRole(v || "")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USER">User</SelectItem>
                <SelectItem value="MODERATOR">Moderator</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRoleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}