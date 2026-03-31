"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

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

export function PrivacySection() {
  const [analytics, setAnalytics] = React.useState(true);
  const [usageData, setUsageData] = React.useState(false);
  const [crashReports, setCrashReports] = React.useState(true);

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
              checked={analytics}
              onCheckedChange={setAnalytics}
              size="sm"
            />
          </SettingRow>
          <SettingRow
            label="Share usage data"
            description="Allow anonymized conversation data to improve AI models."
          >
            <Switch
              checked={usageData}
              onCheckedChange={setUsageData}
              size="sm"
            />
          </SettingRow>
          <SettingRow
            label="Crash reports"
            description="Automatically send error reports when something goes wrong."
          >
            <Switch
              checked={crashReports}
              onCheckedChange={setCrashReports}
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
