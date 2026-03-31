"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { Switch } from "@/components/ui/switch";
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

export function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const [reducedMotion, setReducedMotion] = React.useState(false);
  const [compactMode, setCompactMode] = React.useState(false);

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
              onClick={() => setTheme(id)}
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
            <Switch checked={compactMode} onCheckedChange={setCompactMode} size="sm" />
          </SettingRow>
          <SettingRow
            label="Reduce motion"
            description="Minimize animations throughout the interface."
          >
            <Switch checked={reducedMotion} onCheckedChange={setReducedMotion} size="sm" />
          </SettingRow>
        </div>
      </div>
    </div>
  );
}
