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
  streaming: boolean;
  codeHighlight: boolean;
  persistentMemory: boolean;
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

export function AiPreferencesSection() {
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
            <select className="h-7 w-36 text-[12px] rounded-md border border-input bg-background px-2">
              <option value="eryx-1">Eryx-1</option>
              <option value="eryx-1-fast">Eryx-1 Fast</option>
              <option value="eryx-1-pro">Eryx-1 Pro</option>
            </select>
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
            <select className="h-7 w-28 text-[12px] rounded-md border border-input bg-background px-2">
              <option value="concise">Concise</option>
              <option value="balanced">Balanced</option>
              <option value="detailed">Detailed</option>
            </select>
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
