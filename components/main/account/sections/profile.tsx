"use client";

import * as React from "react";
import { Lock, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const Field = React.memo(function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
        {label}
      </p>
      {children}
    </div>
  );
});

interface AccountData {
  profile: {
    id: string;
    email: string;
    name: string;
    createdAt: string;
    isActive: boolean;
  };
  plan: {
    name: string;
    displayName: string;
    credits: number;
    limits: {
      chats: string | number;
      projects: string | number;
      messages: string | number;
    };
    features: string[];
  };
  subscription: {
    active: boolean;
    status?: string;
    periodEnd?: string;
    cancelAtPeriodEnd?: boolean;
  };
  usage: {
    chats: number;
    projects: number;
    messages: number;
    files: number;
  };
  monthlyUsage: {
    chats: number;
    messages: number;
  };
}

interface ProfileSectionProps {
  accountData?: AccountData;
}

function ProfileSkeleton() {
  return (
    <div className="space-y-5">
      <div>
        <Skeleton className="h-4 w-24 mb-1" />
        <Skeleton className="h-3 w-48" />
      </div>
      <div className="flex flex-col items-center gap-2 py-2">
        <Skeleton className="h-16 w-16 rounded-full" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="space-y-3">
        <div className="space-y-1">
          <Skeleton className="h-3 w-20 mb-1" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-3 w-16 mb-1" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export const ProfileSection = React.memo(function ProfileSection({
  accountData,
}: ProfileSectionProps) {
  if (!accountData) {
    return <ProfileSkeleton />;
  }

  const profile = accountData?.profile;
  const initials = profile?.name
    ? profile.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "Unknown";

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[13px] font-semibold text-foreground mb-0.5">
          Profile
        </h3>
        <p className="text-[12px] text-muted-foreground">
          Manage your public identity and account details.
        </p>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center gap-2 py-2">
        <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl select-none">
          {initials || "U"}
        </div>
        <Button variant="ghost" size="sm" className="h-6 text-[11px] text-muted-foreground px-2 gap-1">
          <Camera className="h-3 w-3" />
          Edit photo
        </Button>
      </div>

      {/* Fields */}
      <div className="space-y-3">
        <Field label="Display name">
          <div className="border border-border rounded-lg px-3 py-2 text-[13px] text-foreground bg-background">
            {profile?.name || "Not set"}
          </div>
        </Field>

        <Field label="Email">
          <div className="border border-border rounded-lg px-3 py-2 text-[13px] text-muted-foreground bg-background flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Lock className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{profile?.email || "Not available"}</span>
            </div>
            <span className="inline-flex items-center rounded-full bg-green-500/10 px-1.5 py-0.5 text-[10px] font-medium text-green-600 dark:text-green-400 shrink-0">
              Verified
            </span>
          </div>
        </Field>
      </div>

      {/* Member since */}
      <p className="text-[11px] text-muted-foreground/60">
        Member since {memberSince}
      </p>
    </div>
  );
});
