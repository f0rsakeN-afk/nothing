"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-border/50 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-foreground">{label}</p>
        {description && (
          <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">
            {description}
          </p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

interface Settings {
  analytics: boolean;
  usageData: boolean;
  crashReports: boolean;
}

async function fetchSettings(): Promise<Settings> {
  const res = await fetch("/api/settings");
  if (!res.ok) throw new Error("Failed to fetch settings");
  return res.json();
}

async function updateSetting(key: string, value: boolean): Promise<Settings> {
  const res = await fetch("/api/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ [key]: value }),
  });
  if (!res.ok) throw new Error("Failed to update settings");
  return res.json();
}

interface PrivacySectionProps {
  settings?: Settings;
}

export function PrivacySection({ settings: propSettings }: PrivacySectionProps) {
  const queryClient = useQueryClient();
  const [localSettings, setLocalSettings] = React.useState<Settings | null>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
    enabled: !propSettings,
    staleTime: 30000,
  });

  const mutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: boolean }) => {
      return updateSetting(key, value);
    },
    onSuccess: (newData) => {
      queryClient.setQueryData(["settings"], newData);
      setLocalSettings(newData);
    },
  });

  const onUpdate = React.useCallback((key: keyof Settings, value: boolean) => {
    mutation.mutate({ key, value });
  }, [mutation]);

  const displaySettings = localSettings || propSettings || settings;

  if ((!propSettings && isLoading) || !displaySettings) {
    return (
      <div className="space-y-5">
        <div>
          <Skeleton className="h-4 w-24 mb-1" />
          <Skeleton className="h-3 w-40" />
        </div>
        <div>
          <Skeleton className="h-3 w-28 mb-1" />
          <div className="rounded-lg border border-border/60 bg-muted/10 px-3 space-y-3">
            <div className="flex items-center justify-between py-3.5 border-b border-border/40">
              <div>
                <Skeleton className="h-3.5 w-20 mb-1" />
                <Skeleton className="h-3 w-56" />
              </div>
              <Skeleton className="h-5 w-9 rounded-full" />
            </div>
            <div className="flex items-center justify-between py-3.5 border-b border-border/40">
              <div>
                <Skeleton className="h-3.5 w-28 mb-1" />
                <Skeleton className="h-3 w-64" />
              </div>
              <Skeleton className="h-5 w-9 rounded-full" />
            </div>
            <div className="flex items-center justify-between py-3.5">
              <div>
                <Skeleton className="h-3.5 w-24 mb-1" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-5 w-9 rounded-full" />
            </div>
          </div>
        </div>
        <div>
          <Skeleton className="h-3 w-32 mb-1" />
          <div className="rounded-lg border border-border/60 bg-muted/10 px-3 space-y-3">
            <div className="flex items-center justify-between py-3.5 border-b border-border/40">
              <div>
                <Skeleton className="h-3.5 w-24 mb-1" />
                <Skeleton className="h-3 w-44" />
              </div>
              <Skeleton className="h-7 w-16 rounded-md" />
            </div>
            <div className="flex items-center justify-between py-3.5">
              <div>
                <Skeleton className="h-3.5 w-40 mb-1" />
                <Skeleton className="h-3 w-56" />
              </div>
              <Skeleton className="h-7 w-16 rounded-md" />
            </div>
          </div>
        </div>
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[13px] font-semibold text-foreground mb-0.5">
          Privacy
        </h3>
        <p className="text-[12px] text-muted-foreground">
          Control what data you share with us.
        </p>
      </div>

      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60 mb-1">
          Data collection
        </p>
        <div className="rounded-lg border border-border/60 bg-muted/20 px-3 divide-y divide-border/40">
          <SettingRow
            label="Analytics"
            description="Help us understand how you use Eryx to improve the product."
          >
            <Switch
              checked={displaySettings.analytics}
              onCheckedChange={(val) => onUpdate("analytics", val)}
              size="sm"
            />
          </SettingRow>
          <SettingRow
            label="Share usage data"
            description="Allow anonymized conversation data to improve AI models."
          >
            <Switch
              checked={displaySettings.usageData}
              onCheckedChange={(val) => onUpdate("usageData", val)}
              size="sm"
            />
          </SettingRow>
          <SettingRow
            label="Crash reports"
            description="Automatically send error reports when something goes wrong."
          >
            <Switch
              checked={displaySettings.crashReports}
              onCheckedChange={(val) => onUpdate("crashReports", val)}
              size="sm"
            />
          </SettingRow>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60 mb-1">
          Data management
        </p>
        <div className="rounded-lg border border-border/60 bg-muted/20 px-3 divide-y divide-border/40">
          <div className="flex items-center justify-between gap-4 py-3.5 border-b border-border/50">
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-foreground">
                Export my data
              </p>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Download all your conversations and account data.
              </p>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-[12px]">
              Export
            </Button>
          </div>
          <div className="flex items-center justify-between gap-4 py-3.5">
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-foreground">
                Delete conversation history
              </p>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Permanently remove all your conversations.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[12px] text-destructive border-destructive/30 hover:bg-destructive/5"
            >
              Clear all
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3.5 flex gap-3">
        <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
        <div>
          <p className="text-[12.5px] font-medium text-foreground mb-0.5">
            Delete account
          </p>
          <p className="text-[12px] text-muted-foreground leading-snug mb-2.5">
            Permanently delete your account and all associated data. This cannot
            be undone.
          </p>
          <Button
            variant="destructive"
            size="sm"
            className="h-7 text-[12px] text-white"
          >
            Delete my account
          </Button>
        </div>
      </div>
    </div>
  );
}
