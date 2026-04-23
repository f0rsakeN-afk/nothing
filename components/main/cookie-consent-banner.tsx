"use client";

import { useState } from "react";
import { X, Cookie, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCookieConsent, type CookieConsent } from "@/hooks/use-cookie-consent";
import { cn } from "@/lib/utils";

function CookieCategoryItem({
  title,
  description,
  enabled,
  onToggle,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          enabled ? "bg-primary" : "bg-muted"
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform",
            enabled ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
    </div>
  );
}

export function CookieConsentBanner() {
  const { consent, updateConsent, acceptAll, rejectAll, showBanner, hideBanner } = useCookieConsent();
  const [expanded, setExpanded] = useState(false);
  const [localConsent, setLocalConsent] = useState(consent);

  if (!showBanner) return null;

  const handleAccept = () => {
    acceptAll();
  };

  const handleReject = () => {
    rejectAll();
  };

  const handleSavePreferences = () => {
    updateConsent(localConsent);
  };

  const handleToggle = (category: keyof CookieConsent) => {
    setLocalConsent((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:pb-6">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-border bg-background shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                <Cookie className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">Cookie Preferences</h2>
                <p className="text-xs text-muted-foreground">Manage how we use cookies</p>
              </div>
            </div>
            <button
              onClick={hideBanner}
              className="rounded-full p-1.5 text-muted-foreground hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Quick Actions */}
          <div className="px-5 pb-4 flex gap-3">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-9 text-xs"
              onClick={handleReject}
            >
             Reject all
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-9 text-xs"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? "Less" : "Preferences"}
              {expanded ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />}
            </Button>
            <Button
              size="sm"
              className="flex-1 h-9 text-xs"
              onClick={handleAccept}
            >
              Accept all
            </Button>
          </div>

          {/* Expanded Preferences */}
          {expanded && (
            <div className="border-t border-border px-5 py-4 bg-muted/20">
              <p className="text-xs text-muted-foreground mb-3">
                Customize your cookie preferences. Essential cookies are always enabled.
              </p>

              <div className="divide-y divide-border/50">
                <CookieCategoryItem
                  title="Analytics"
                  description="Help us understand how visitors interact with our website."
                  enabled={localConsent.analytics}
                  onToggle={() => handleToggle("analytics")}
                />
                <CookieCategoryItem
                  title="Personalization"
                  description="Remember your preferences and provide enhanced features."
                  enabled={localConsent.personalization}
                  onToggle={() => handleToggle("personalization")}
                />
                <CookieCategoryItem
                  title="Marketing"
                  description="Deliver relevant ads and track campaign performance."
                  enabled={localConsent.marketing}
                  onToggle={() => handleToggle("marketing")}
                />
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleReject}>
                  Cancel
                </Button>
                <Button size="sm" className="h-8 text-xs" onClick={handleSavePreferences}>
                  Save preferences
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
