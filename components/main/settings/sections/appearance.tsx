"use client";

import { useCallback } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useSettings } from "@/components/providers/settings-provider";
import { useHaptics } from "@/hooks/use-web-haptics";

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

export function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const { settings, updateSetting } = useSettings();
  const { trigger } = useHaptics();

  const handleThemeSelect = useCallback((id: string) => {
    trigger("success");
    setTheme(id);
    updateSetting("theme", id);
  }, [setTheme, updateSetting, trigger]);

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
              onClick={() => handleThemeSelect(id)}
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
              checked={settings.compactMode}
              onCheckedChange={(val) => updateSetting("compactMode", val)}
              size="sm"
            />
          </SettingRow>
          <SettingRow
            label="Reduce motion"
            description="Minimize animations throughout the interface."
          >
            <Switch
              checked={settings.reducedMotion}
              onCheckedChange={(val) => updateSetting("reducedMotion", val)}
              size="sm"
            />
          </SettingRow>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60 mb-1">
          Home Screen
        </p>
        <div className="rounded-lg border border-border/60 bg-muted/20 px-3 divide-y divide-border/40">
          <SettingRow
            label="Show chips"
            description="Show profession chips on the home screen."
          >
            <Switch
              checked={settings.showChips}
              onCheckedChange={(val) => updateSetting("showChips", val)}
              size="sm"
            />
          </SettingRow>
          <SettingRow
            label="Show tagline"
            description="Show the tagline on the home screen."
          >
            <Switch
              checked={settings.showTagline}
              onCheckedChange={(val) => updateSetting("showTagline", val)}
              size="sm"
            />
          </SettingRow>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60 mb-1">
          Sidebar
        </p>
        <div className="rounded-lg border border-border/60 bg-muted/20 px-3 divide-y divide-border/40">
          <SettingRow
            label="New Chat"
            description="Show New Chat button in the sidebar."
          >
            <Switch
              checked={settings.showNewChat}
              onCheckedChange={(val) => updateSetting("showNewChat", val)}
              size="sm"
            />
          </SettingRow>
          <SettingRow
            label="Search"
            description="Show Search in the sidebar."
          >
            <Switch
              checked={settings.showSearch}
              onCheckedChange={(val) => updateSetting("showSearch", val)}
              size="sm"
            />
          </SettingRow>
          <SettingRow
            label="Memory"
            description="Show Memory in the sidebar."
          >
            <Switch
              checked={settings.showMemory}
              onCheckedChange={(val) => updateSetting("showMemory", val)}
              size="sm"
            />
          </SettingRow>
          <SettingRow
            label="Files"
            description="Show Files in the sidebar."
          >
            <Switch
              checked={settings.showFiles}
              onCheckedChange={(val) => updateSetting("showFiles", val)}
              size="sm"
            />
          </SettingRow>
          <SettingRow
            label="Apps"
            description="Show Apps in the sidebar."
          >
            <Switch
              checked={settings.showApps}
              onCheckedChange={(val) => updateSetting("showApps", val)}
              size="sm"
            />
          </SettingRow>
        </div>
      </div>
    </div>
  );
}
