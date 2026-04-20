"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const THEMES = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark",  label: "Dark",  icon: Moon },
  { id: "system", label: "System", icon: Monitor },
] as const;

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
  compactMode: boolean;
  reducedMotion: boolean;
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

interface AppearanceSectionProps {
  settings?: Settings;
}

export function AppearanceSection({ settings: propSettings }: AppearanceSectionProps) {
  const { theme, setTheme } = useTheme();
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
          <Skeleton className="h-4 w-28 mb-1" />
          <Skeleton className="h-3 w-44" />
        </div>
        <div>
          <Skeleton className="h-3 w-16 mb-2" />
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
          </div>
        </div>
        <div>
          <Skeleton className="h-3 w-20 mb-1" />
          <div className="rounded-lg border border-border/60 bg-muted/10 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-3.5 w-28 mb-1" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-5 w-9 rounded-full" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-3.5 w-28 mb-1" />
                <Skeleton className="h-3 w-44" />
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
          Appearance
        </h3>
        <p className="text-[12px] text-muted-foreground">
          Customize the look and feel of the app.
        </p>
      </div>

      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60 mb-2">
          Theme
        </p>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                setTheme(id);
                onUpdate("theme", id);
              }}
              className={cn(
                "flex flex-col items-center gap-2 rounded-lg border p-3 text-center transition-all",
                theme === id
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border hover:border-border/80 hover:bg-muted/40",
              )}
            >
              <Icon className={cn("h-4 w-4", theme === id ? "text-primary" : "text-muted-foreground")} />
              <span className={cn("text-[12px] font-medium", theme === id ? "text-foreground" : "text-muted-foreground")}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60 mb-1">
          Display
        </p>
        <div className="rounded-lg border border-border/60 bg-muted/20 px-3 divide-y divide-border/40">
          <SettingRow
            label="Compact mode"
            description="Reduce spacing between messages for a denser layout."
          >
            <Switch
              checked={displaySettings.compactMode}
              onCheckedChange={(val) => onUpdate("compactMode", val)}
              size="sm"
            />
          </SettingRow>
          <SettingRow
            label="Reduce motion"
            description="Minimize animations throughout the interface."
          >
            <Switch
              checked={displaySettings.reducedMotion}
              onCheckedChange={(val) => onUpdate("reducedMotion", val)}
              size="sm"
            />
          </SettingRow>
        </div>
      </div>
    </div>
  );
}
