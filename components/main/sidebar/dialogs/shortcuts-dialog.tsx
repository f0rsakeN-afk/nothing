"use client";

import * as React from "react";
import { Keyboard } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ── Key badge ─────────────────────────────────────────────────────────────

const Kbd = React.memo(function Kbd({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-md border border-border bg-muted text-[10.5px] font-medium text-muted-foreground font-sans leading-none">
      {children}
    </kbd>
  );
});

// ── Shortcut row ──────────────────────────────────────────────────────────

const ShortcutRow = React.memo(function ShortcutRow({
  label,
  keys,
  isLast,
}: {
  label: string;
  keys: readonly (readonly string[])[];
  isLast?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 py-2.5 ${
        !isLast ? "border-b border-border/40" : ""
      }`}
    >
      <span className="text-[12.5px] text-foreground">{label}</span>
      <div className="flex items-center gap-1.5 shrink-0">
        {keys.map((combo, i) => (
          <React.Fragment key={i}>
            {i > 0 && (
              <span className="text-[10px] text-muted-foreground/50">or</span>
            )}
            <span className="flex items-center gap-0.5">
              {combo.map((k, j) => (
                <React.Fragment key={j}>
                  <Kbd>{k}</Kbd>
                  {j < combo.length - 1 && (
                    <span className="text-[10px] text-muted-foreground/40 mx-0.5">
                      +
                    </span>
                  )}
                </React.Fragment>
              ))}
            </span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
});

// ── Section ───────────────────────────────────────────────────────────────

const Section = React.memo(function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50 mb-1">
        {title}
      </p>
      <div className="rounded-lg border border-border/60 bg-muted/20 px-3">
        {children}
      </div>
    </div>
  );
});

// ── Data (translation keys) ───────────────────────────────────────────────

const SECTION_KEYS = [
  { titleKey: "shortcuts.navigation", shortcuts: ["shortcuts.searchChats", "shortcuts.openSettings", "shortcuts.openAccount", "shortcuts.openFeedback"] },
  { titleKey: "shortcuts.interface", shortcuts: ["shortcuts.toggleSidebar", "shortcuts.title"] },
  { titleKey: "shortcuts.chat", shortcuts: ["shortcuts.sendMessage", "shortcuts.newLine", "shortcuts.clearInput"] },
] as const;

// ── Dialog ────────────────────────────────────────────────────────────────

interface ShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ShortcutsDialog = React.memo(function ShortcutsDialog({
  open,
  onOpenChange,
}: ShortcutsDialogProps) {
  const t = useTranslations();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg gap-0 p-0 overflow-hidden"
        showCloseButton
      >
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Keyboard className="h-4 w-4 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-[14px] font-semibold text-foreground leading-none">
                {t("shortcuts.title")}
              </DialogTitle>
              <p className="text-[12px] text-muted-foreground mt-1">
                {t("shortcuts.speedUpWorkflow")}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Shortcuts */}
        <div className="px-5 py-4 space-y-4">
          {SECTION_KEYS.map((section) => (
            <Section key={section.titleKey} title={t(section.titleKey)}>
              {section.shortcuts.map((shortcutKey, i) => (
                <ShortcutRow
                  key={shortcutKey}
                  label={t(shortcutKey)}
                  keys={shortcutKey === "shortcuts.searchChats" ? [["⌘", "K"], ["Ctrl", "K"]] :
                        shortcutKey === "shortcuts.openSettings" ? [["⌘", ","], ["Ctrl", ","]] :
                        shortcutKey === "shortcuts.openAccount" ? [["⌘", "⇧", "A"], ["Ctrl", "⇧", "A"]] :
                        shortcutKey === "shortcuts.openFeedback" ? [["⌘", "⇧", "F"], ["Ctrl", "⇧", "F"]] :
                        shortcutKey === "shortcuts.toggleSidebar" ? [["⌘", "B"], ["Ctrl", "B"]] :
                        shortcutKey === "shortcuts.title" ? [["?"]] :
                        shortcutKey === "shortcuts.sendMessage" ? [["Enter"]] :
                        shortcutKey === "shortcuts.newLine" ? [["⇧", "Enter"]] :
                        [["Esc"]]}
                  isLast={i === section.shortcuts.length - 1}
                />
              ))}
            </Section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
});