"use client";

import * as React from "react";
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

export function AiPreferencesSection() {
  const [streaming, setStreaming] = React.useState(true);
  const [codeHighlight, setCodeHighlight] = React.useState(true);
  const [memory, setMemory] = React.useState(false);

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
            <Select defaultValue="eryx-1">
              <SelectTrigger size="sm" className="w-36 h-7 text-[12px]">
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
            <Select defaultValue="balanced">
              <SelectTrigger size="sm" className="w-28 h-7 text-[12px]">
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
            <Switch checked={streaming} onCheckedChange={setStreaming} size="sm" />
          </SettingRow>
          <SettingRow
            label="Syntax highlighting"
            description="Highlight code blocks in AI responses."
          >
            <Switch checked={codeHighlight} onCheckedChange={setCodeHighlight} size="sm" />
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
            <Switch checked={memory} onCheckedChange={setMemory} size="sm" />
          </SettingRow>
        </div>
      </div>
    </div>
  );
}
