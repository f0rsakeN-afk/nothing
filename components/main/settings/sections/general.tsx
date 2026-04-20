"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  theme: string;
  language: string;
  autoTitle: boolean;
  enterToSend: boolean;
  showSuggestions: boolean;
  compactMode: boolean;
  reducedMotion: boolean;
  streaming: boolean;
  codeHighlight: boolean;
  persistentMemory: boolean;
  emailUpdates: boolean;
  emailMarketing: boolean;
  browserNotifs: boolean;
  usageAlerts: boolean;
  analytics: boolean;
  usageData: boolean;
  crashReports: boolean;
}

async function fetchSettings(): Promise<Settings> {
  const res = await fetch("/api/settings");
  if (!res.ok) throw new Error("Failed to fetch settings");
  return res.json();
}

async function updateSetting(key: string, value: boolean | string): Promise<Settings> {
  const res = await fetch("/api/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ [key]: value }),
  });
  if (!res.ok) throw new Error("Failed to update settings");
  return res.json();
}

interface GeneralSectionProps {
  settings?: Settings;
}

export function GeneralSection({ settings: propSettings }: GeneralSectionProps) {
  const queryClient = useQueryClient();
  const [localSettings, setLocalSettings] = useState<Settings | null>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
    enabled: !propSettings,
    staleTime: 30000,
  });

  const mutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: boolean | string }) => {
      return updateSetting(key, value);
    },
    onSuccess: (newData) => {
      queryClient.setQueryData(["settings"], newData);
      setLocalSettings(newData);
    },
  });

  const onUpdate = useCallback((key: keyof Settings, value: boolean | string) => {
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
          <Skeleton className="h-3 w-28 mb-2" />
          <div className="rounded-lg border border-border/60 bg-muted/10 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-3.5 w-36 mb-1" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-5 w-9 rounded-full" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-3.5 w-40 mb-1" />
                <Skeleton className="h-3 w-56" />
              </div>
              <Skeleton className="h-5 w-9 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[13px] font-semibold text-foreground mb-0.5">
          General
        </h3>
        <p className="text-[12px] text-muted-foreground">
          Control how the app behaves day-to-day.
        </p>
      </div>

      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60 mb-1">
          Conversations
        </p>
        <div className="rounded-lg border border-border/60 bg-muted/20 px-3 divide-y divide-border/40">
          <SettingRow
            label="Auto-title conversations"
            description="Automatically generate a title from the first message."
          >
            <Switch
              checked={displaySettings.autoTitle}
              onCheckedChange={(val) => onUpdate("autoTitle", val)}
              size="sm"
            />
          </SettingRow>
          <SettingRow
            label="Show message suggestions"
            description="Display quick prompt suggestions on the home screen."
          >
            <Switch
              checked={displaySettings.showSuggestions}
              onCheckedChange={(val) => onUpdate("showSuggestions", val)}
              size="sm"
            />
          </SettingRow>
          <SettingRow
            label="Enter to send"
            description="Press Enter to send. Use Shift+Enter for a new line."
          >
            <Switch
              checked={displaySettings.enterToSend}
              onCheckedChange={(val) => onUpdate("enterToSend", val)}
              size="sm"
            />
          </SettingRow>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60 mb-1">
          Preferences
        </p>
        <div className="rounded-lg border border-border/60 bg-muted/20 px-3">
          <SettingRow
            label="Language"
            description="Interface language for the app."
          >
            <Select
              value={displaySettings.language}
              onValueChange={(val) => onUpdate("language", val || "en")}
            >
              <SelectTrigger size="sm" className="w-32 h-7 text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="de">Deutsch</SelectItem>
                <SelectItem value="ja">日本語</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
        </div>
      </div>
    </div>
  );
}
