"use client";
/* eslint-disable */

import { useState, useCallback, useEffect } from "react";
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
import { toast } from "@/components/ui/sileo-toast";

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
  streaming: boolean;
  codeHighlight: boolean;
  persistentMemory: boolean;
}

interface CustomizeData {
  detailLevel: string;
  model?: string;
}

async function fetchSettings(): Promise<Settings> {
  const res = await fetch("/api/settings");
  if (!res.ok) throw new Error("Failed to fetch settings");
  return res.json();
}

async function fetchCustomize(): Promise<CustomizeData> {
  const res = await fetch("/api/customize");
  if (!res.ok) throw new Error("Failed to fetch customize");
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

async function updateDetailLevel(detailLevel: string): Promise<CustomizeData> {
  const res = await fetch("/api/customize", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ detailLevel }),
  });
  if (!res.ok) throw new Error("Failed to update detail level");
  return res.json();
}

interface AiPreferencesSectionProps {
  settings?: Settings;
}

export function AiPreferencesSection({ settings: propSettings }: AiPreferencesSectionProps) {
  const queryClient = useQueryClient();
  const [localSettings, setLocalSettings] = useState<Settings | null>(null);
  const [detailLevel, setDetailLevel] = useState<string>("balanced");

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
    enabled: !propSettings,
    staleTime: 30000,
  });

  const { data: customizeData, isLoading: customizeLoading } = useQuery({
    queryKey: ["customize"],
    queryFn: fetchCustomize,
  });

  useEffect(() => {
    if (customizeData?.detailLevel) {
      setDetailLevel(customizeData.detailLevel);
    }
  }, [customizeData]);

  const mutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: boolean }) => {
      return updateSetting(key, value);
    },
    onSuccess: (newData) => {
      queryClient.setQueryData(["settings"], newData);
      setLocalSettings(newData);
    },
  });

  const detailLevelMutation = useMutation({
    mutationFn: async (level: string) => {
      return updateDetailLevel(level);
    },
    onSuccess: (newData) => {
      queryClient.setQueryData(["customize"], newData);
      toast.success("Response style updated");
    },
    onError: () => {
      toast.error("Failed to update response style");
    },
  });

  const onUpdate = useCallback((key: keyof Settings, value: boolean) => {
    mutation.mutate({ key, value });
  }, [mutation]);

  const onDetailLevelChange = useCallback((value: string | null) => {
    if (value === null) return;
    setDetailLevel(value);
    detailLevelMutation.mutate(value);
  }, [detailLevelMutation]);

  const displaySettings = localSettings || propSettings || settings;

  if ((!propSettings && (settingsLoading || customizeLoading)) || !displaySettings) {
    return (
      <div className="space-y-5">
        <div>
          <Skeleton className="h-4 w-32 mb-1" />
          <Skeleton className="h-3 w-52" />
        </div>
        <div>
          <Skeleton className="h-3 w-20 mb-1" />
          <div className="rounded-lg border border-border/60 bg-muted/10 px-3">
            <div className="flex items-center justify-between py-3.5">
              <div>
                <Skeleton className="h-3.5 w-28 mb-1" />
                <Skeleton className="h-3 w-36" />
              </div>
              <Skeleton className="h-7 w-36 rounded-md" />
            </div>
          </div>
        </div>
        <div>
          <Skeleton className="h-3 w-24 mb-1" />
          <div className="rounded-lg border border-border/60 bg-muted/10 px-3 space-y-3">
            <div className="flex items-center justify-between py-3.5 border-b border-border/40">
              <div>
                <Skeleton className="h-3.5 w-28 mb-1" />
                <Skeleton className="h-3 w-44" />
              </div>
              <Skeleton className="h-7 w-28 rounded-md" />
            </div>
            <div className="flex items-center justify-between py-3.5 border-b border-border/40">
              <div>
                <Skeleton className="h-3.5 w-32 mb-1" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-5 w-9 rounded-full" />
            </div>
            <div className="flex items-center justify-between py-3.5">
              <div>
                <Skeleton className="h-3.5 w-32 mb-1" />
                <Skeleton className="h-3 w-44" />
              </div>
              <Skeleton className="h-5 w-9 rounded-full" />
            </div>
          </div>
        </div>
        <div>
          <Skeleton className="h-3 w-20 mb-1" />
          <div className="rounded-lg border border-border/60 bg-muted/10 px-3">
            <div className="flex items-center justify-between py-3.5">
              <div>
                <Skeleton className="h-3.5 w-36 mb-1" />
                <Skeleton className="h-3 w-52" />
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
          AI Preferences
        </h3>
        <p className="text-[12px] text-muted-foreground">
          Configure how the AI responds to your queries.
        </p>
      </div>

      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60 mb-1">
          Model
        </p>
        <div className="rounded-lg border border-border/60 bg-muted/20 px-3">
          <SettingRow
            label="Default model"
            description="Model used for new conversations."
          >
            <Select value="eryx-1" onValueChange={(val) => console.log("model:", val)}>
              <SelectTrigger className="h-7 w-36 text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="eryx-1">Eryx-1</SelectItem>
                <SelectItem value="eryx-1-fast">Eryx-1 Fast</SelectItem>
                <SelectItem value="eryx-1-pro">Eryx-1 Pro</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60 mb-1">
          Response
        </p>
        <div className="rounded-lg border border-border/60 bg-muted/20 px-3 divide-y divide-border/40">
          <SettingRow
            label="Response style"
            description="How detailed and verbose AI responses should be."
          >
            <Select value={detailLevel} onValueChange={onDetailLevelChange}>
              <SelectTrigger className="h-7 w-28 text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="concise">Concise</SelectItem>
                <SelectItem value="balanced">Balanced</SelectItem>
                <SelectItem value="detailed">Detailed</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
          <SettingRow
            label="Stream responses"
            description="Display AI output token-by-token as it's generated."
          >
            <Switch
              checked={displaySettings.streaming}
              onCheckedChange={(val) => onUpdate("streaming", val)}
              size="sm"
            />
          </SettingRow>
          <SettingRow
            label="Syntax highlighting"
            description="Highlight code blocks in AI responses."
          >
            <Switch
              checked={displaySettings.codeHighlight}
              onCheckedChange={(val) => onUpdate("codeHighlight", val)}
              size="sm"
            />
          </SettingRow>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60 mb-1">
          Memory
        </p>
        <div className="rounded-lg border border-border/60 bg-muted/20 px-3">
          <SettingRow
            label="Persistent memory"
            description="Allow AI to remember context across conversations."
          >
            <Switch
              checked={displaySettings.persistentMemory}
              onCheckedChange={(val) => onUpdate("persistentMemory", val)}
              size="sm"
            />
          </SettingRow>
        </div>
      </div>
    </div>
  );
}
