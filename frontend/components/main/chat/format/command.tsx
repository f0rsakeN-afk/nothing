"use client";

import { memo, useMemo } from "react";
import { Keyboard } from "lucide-react";

interface CommandItem {
  keys: string[];
  description: string;
}

interface CommandSection {
  label?: string;
  items: CommandItem[];
}

interface CommandData {
  title?: string;
  sections?: CommandSection[];
  items?: CommandItem[];
}

const KeyBadge = memo(function KeyBadge({ value }: { value: string }) {
  return (
    <kbd className="inline-flex items-center rounded-md border border-border bg-muted/80 px-1.5 py-0.5 font-mono text-[11px] font-medium text-foreground/80 shadow-[0_1px_0_hsl(var(--border))]">
      {value}
    </kbd>
  );
});

export const CommandVisualizer = memo(function CommandVisualizer({
  data,
}: {
  data: string;
}) {
  const parsed = useMemo((): CommandData | null => {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }, [data]);

  if (!parsed) return null;

  const sections: CommandSection[] = parsed.sections ?? [
    { items: parsed.items ?? [] },
  ];

  return (
    <div className="my-6 overflow-hidden rounded-xl border border-border bg-card/50">
      <div className="flex items-center gap-2 border-b border-border/50 bg-muted/30 px-4 py-2.5">
        <Keyboard className="h-3.5 w-3.5 text-muted-foreground/50" />
        <span className="text-[13px] font-semibold text-foreground">
          {parsed.title ?? "Commands"}
        </span>
      </div>

      <div className="divide-y divide-border/30">
        {sections.map((section, si) => (
          <div key={si}>
            {section.label && (
              <div className="px-4 pb-1 pt-3">
                <span className="text-[10.5px] font-semibold uppercase tracking-widest text-muted-foreground/45">
                  {section.label}
                </span>
              </div>
            )}
            <div className="divide-y divide-border/20">
              {section.items.map((item, ii) => (
                <div
                  key={ii}
                  className="flex items-center justify-between gap-6 px-4 py-2.5"
                >
                  <span className="text-[13px] text-foreground/75 min-w-0">
                    {item.description}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    {item.keys.map((k, ki) => (
                      <span key={ki} className="flex items-center gap-1">
                        {ki > 0 && (
                          <span className="text-[10px] text-muted-foreground/35 select-none">
                            +
                          </span>
                        )}
                        <KeyBadge value={k} />
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
