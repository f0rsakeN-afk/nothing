"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

export function GeneralSection() {
  const [autoTitle, setAutoTitle] = React.useState(true);
  const [suggestions, setSuggestions] = React.useState(true);
  const [enterSend, setEnterSend] = React.useState(false);

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
              checked={autoTitle}
              onCheckedChange={setAutoTitle}
              size="sm"
            />
          </SettingRow>
          <SettingRow
            label="Show message suggestions"
            description="Display quick prompt suggestions on the home screen."
          >
            <Switch
              checked={suggestions}
              onCheckedChange={setSuggestions}
              size="sm"
            />
          </SettingRow>
          <SettingRow
            label="Enter to send"
            description="Press Enter to send. Use Shift+Enter for a new line."
          >
            <Switch
              checked={enterSend}
              onCheckedChange={setEnterSend}
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
            <Select defaultValue="en">
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
