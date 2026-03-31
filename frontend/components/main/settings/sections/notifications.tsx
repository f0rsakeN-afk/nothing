"use client";

import * as React from "react";
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

export function NotificationsSection() {
  const [emailUpdates, setEmailUpdates] = React.useState(true);
  const [emailMarketing, setEmailMarketing] = React.useState(false);
  const [browserNotifs, setBrowserNotifs] = React.useState(false);
  const [usageAlerts, setUsageAlerts] = React.useState(true);

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
            <Switch checked={emailUpdates} onCheckedChange={setEmailUpdates} size="sm" />
          </SettingRow>
          <SettingRow
            label="Tips &amp; tutorials"
            description="Helpful guides to get the most out of Eryx."
          >
            <Switch checked={emailMarketing} onCheckedChange={setEmailMarketing} size="sm" />
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
            <Switch checked={browserNotifs} onCheckedChange={setBrowserNotifs} size="sm" />
          </SettingRow>
          <SettingRow
            label="Usage alerts"
            description="Notify when you're approaching plan limits."
          >
            <Switch checked={usageAlerts} onCheckedChange={setUsageAlerts} size="sm" />
          </SettingRow>
        </div>
      </div>
    </div>
  );
}
