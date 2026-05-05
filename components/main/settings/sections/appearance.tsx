"use client";

import { useCallback } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useSettings } from "@/components/providers/settings-provider";

interface ThemeOption {
  id: string;
  label: string;
  icon?: LucideIcon;
  swatch: readonly [string, string, string];
  description?: string;
}

const BASE_THEMES: ThemeOption[] = [
  { id: "system", label: "System", icon: Monitor, swatch: ["oklch(0.5 0 0)", "oklch(0.25 0 0)", "oklch(0.75 0 0)"] },
  { id: "light", label: "Light", icon: Sun, swatch: ["oklch(0.9551 0 0)", "oklch(0.4891 0 0)", "oklch(0.8078 0 0)"] },
  { id: "dark", label: "Dark", icon: Moon, swatch: ["oklch(0.2178 0 0)", "oklch(0.7058 0 0)", "oklch(0.3715 0 0)"] },
];

const COLOR_SCHEMES: ThemeOption[] = [
  {
    id: "civic",
    label: "Civic",
    swatch: ["oklch(0.9195 0.0169 88.0030)", "oklch(0.2350 0 0)", "oklch(0.3012 0 0)"],
    description: "Clean civic aesthetic",
  },
  {
    id: "studio",
    label: "Studio",
    swatch: ["oklch(0.9755 0.0067 97.3510)", "oklch(0.2178 0 0)", "oklch(0.7414 0.0738 84.5946)"],
    description: "Minimal workspace feel",
  },
  {
    id: "dawn",
    label: "Dawn",
    swatch: ["oklch(0.9801 0.0034 67.7835)", "oklch(0.2006 0.0138 34.3909)", "oklch(0.4732 0.1247 46.2007)"],
    description: "Warm dawn tones",
  },
  {
    id: "dusk",
    label: "Dusk",
    swatch: ["oklch(0.9901 0.0161 95.2193)", "oklch(0.2138 0.0019 286.2347)", "oklch(0.5854 0.1022 167.0051)"],
    description: "Soft dusk palette",
  },
  {
    id: "code",
    label: "Code",
    swatch: ["oklch(1 0 0)", "oklch(0.1450 0 0)", "oklch(0.4701 0.0461 197.6998)"],
    description: "IDE-inspired monochrome",
  },
  {
    id: "nebula",
    label: "Nebula",
    swatch: ["oklch(0.9777 0.0041 301.4256)", "oklch(0.3651 0.0325 287.0807)", "oklch(0.6104 0.0767 299.7335)"],
    description: "Cosmic purple haze",
  },
  {
    id: "ember",
    label: "Ember",
    swatch: ["oklch(0.9702 0 0)", "oklch(0.3562 0 0)", "oklch(0.6892 0.2004 22.3840)"],
    description: "Warm ember glow",
  },
  {
    id: "aura",
    label: "Aura",
    swatch: ["oklch(0.9901 0.0161 95.2193)", "oklch(0.2138 0.0019 286.2347)", "oklch(0.5854 0.1022 167.0051)"],
    description: "Ethereal green-blue",
  },
  {
    id: "pulse",
    label: "Pulse",
    swatch: ["oklch(0.9777 0.0041 301.4256)", "oklch(0.3651 0.0325 287.0807)", "oklch(0.6104 0.0767 299.7335)"],
    description: "Pink pulse energy",
  },
  {
    id: "forge",
    label: "Forge",
    swatch: ["oklch(0.9702 0 0)", "oklch(0.3562 0 0)", "oklch(0.6892 0.2004 22.3840)"],
    description: "Dark forge heat",
  },
];

function ThemeSwatch({ colors }: { colors: readonly [string, string, string] }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" className="shrink-0 rounded border border-border/40 overflow-hidden">
      <rect width="24" height="24" fill={colors[0]} />
      <circle cx="8" cy="12" r="5" fill={colors[1]} />
      <rect x="15" y="7" width="7" height="10" rx="2" fill={colors[2]} />
    </svg>
  );
}

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
  const { setTheme } = useTheme();
  const { settings, updateSetting } = useSettings();

  const handleModeSelect = useCallback(
    (id: string) => {
      setTheme(id);
      updateSetting("mode", id);
    },
    [setTheme, updateSetting]
  );

  const handleColorSchemeSelect = useCallback(
    (id: string) => {
      updateSetting("colorScheme", id);
    },
    [updateSetting]
  );

  const isModeActive = (id: string) => settings.mode === id;
  const isColorSchemeActive = (id: string) => settings.colorScheme === id;

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
          Mode
        </p>
        <div className="grid grid-cols-3 gap-2">
          {BASE_THEMES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleModeSelect(id)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-lg border p-3 text-center transition-all",
                isModeActive(id)
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border hover:border-border/80 hover:bg-muted/40"
              )}
            >
              {Icon && (
                <Icon
                  className={cn(
                    "h-4 w-4",
                    isModeActive(id) ? "text-primary" : "text-muted-foreground"
                  )}
                />
              )}
              <span
                className={cn(
                  "text-[12px] font-medium",
                  isModeActive(id) ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60 mb-2">
          Color Theme
        </p>
        <div className="grid grid-cols-4 gap-2">
          {COLOR_SCHEMES.map(({ id, label, swatch, description }) => (
            <button
              key={id}
              onClick={() => handleColorSchemeSelect(id)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-lg border p-2 text-center transition-all",
                isColorSchemeActive(id)
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border hover:border-border/80 hover:bg-muted/40"
              )}
            >
              <ThemeSwatch colors={swatch} />
              <span
                className={cn(
                  "text-[10px] font-medium leading-tight",
                  isColorSchemeActive(id) ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {label}
              </span>
              {description && isColorSchemeActive(id) && (
                <span className="text-[9px] text-muted-foreground leading-tight">
                  {description}
                </span>
              )}
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
