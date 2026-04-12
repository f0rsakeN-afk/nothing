"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";

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
  emailUpdates: boolean;
  emailMarketing: boolean;
  browserNotifs: boolean;
  usageAlerts: boolean;
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

export function NotificationsSection() {
  const queryClient = useQueryClient();
  const [localSettings, setLocalSettings] = useState<Settings | null>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
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

  const onUpdate = useCallback((key: keyof Settings, value: boolean) => {
    mutation.mutate({ key, value });
  }, [mutation]);

  const displaySettings = localSettings || settings;

  if (isLoading || !displaySettings) {
    return (
      <div className="space-y-5">
        <div className="h-20 rounded-lg bg-muted/20 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[13px] font-semibold text-foreground mb-0.5">
          Notifications
        </h3>
        <p className="text-[12px] text-muted-foreground">
          Choose what you want to be notified about.
        </p>
      </div>

      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60 mb-1">
          Email
        </p>
        <div className="rounded-lg border border-border/60 bg-muted/20 px-3 divide-y divide-border/40">
          <SettingRow
            label="Product updates"
            description="New features, improvements, and release notes."
          >
            <Switch
              checked={displaySettings.emailUpdates}
              onCheckedChange={(val) => onUpdate("emailUpdates", val)}
              size="sm"
            />
          </SettingRow>
          <SettingRow
            label="Tips &amp; tutorials"
            description="Helpful guides to get the most out of Eryx."
          >
            <Switch
              checked={displaySettings.emailMarketing}
              onCheckedChange={(val) => onUpdate("emailMarketing", val)}
              size="sm"
            />
          </SettingRow>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60 mb-1">
          In-app
        </p>
        <div className="rounded-lg border border-border/60 bg-muted/20 px-3 divide-y divide-border/40">
          <SettingRow
            label="Browser notifications"
            description="Receive push notifications in your browser."
          >
            <Switch
              checked={displaySettings.browserNotifs}
              onCheckedChange={(val) => onUpdate("browserNotifs", val)}
              size="sm"
            />
          </SettingRow>
          <SettingRow
            label="Usage alerts"
            description="Notify when you're approaching plan limits."
          >
            <Switch
              checked={displaySettings.usageAlerts}
              onCheckedChange={(val) => onUpdate("usageAlerts", val)}
              size="sm"
            />
          </SettingRow>
        </div>
      </div>
    </div>
  );
}
