"use client";

import { useState, useEffect, useCallback } from "react";
import { Cookie, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useCookieConsent,
  type CookieConsent
} from "@/hooks/use-cookie-consent";
import { useHaptics } from "@/hooks/use-web-haptics";
import { cn } from "@/lib/utils";

function CookieToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          checked ? "bg-primary" : "bg-muted"
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-4" : "translate-x-0.5",
            "mt-0.5"
          )}
        />
      </div>
      <span className="text-sm text-foreground">{label}</span>
    </label>
  );
}

export function CookieConsentBanner() {
  const { consent, updateConsent, acceptAll, rejectAll, showBanner, hideBanner, hasConsented } =
    useCookieConsent();
  const { trigger } = useHaptics();
  const [expanded, setExpanded] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (showBanner) {
      setVisible(true);
    }
  }, [showBanner]);

  const handleAccept = useCallback(() => {
    trigger("success");
    acceptAll();
    setVisible(false);
  }, [acceptAll, trigger]);

  const handleReject = useCallback(() => {
    trigger("nudge");
    rejectAll();
    setVisible(false);
  }, [rejectAll, trigger]);

  const handleSave = useCallback(() => {
    trigger("success");
    updateConsent(consent);
    setVisible(false);
  }, [updateConsent, consent, trigger]);

  const handleManage = useCallback(() => {
    trigger("nudge");
    setExpanded(true);
  }, [trigger]);

  const toggleAnalytics = useCallback(() => {
    trigger("success");
    updateConsent({ ...consent, analytics: !consent.analytics });
  }, [updateConsent, consent, trigger]);

  const togglePersonalization = useCallback(() => {
    trigger("success");
    updateConsent({ ...consent, personalization: !consent.personalization });
  }, [updateConsent, consent, trigger]);

  const hideExpanded = useCallback(() => {
    trigger("nudge");
    setExpanded(false);
  }, [trigger]);

  if (!visible || hasConsented) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="relative">
        {/* Expanded preferences panel */}
        {expanded && (
          <div className="absolute bottom-full left-0 right-0 mb-3 animate-in slide-in-from-bottom-2 fade-in duration-200">
            <div className="mx-auto max-w-sm rounded-xl border border-border bg-background shadow-xl">
              <div className="border-b border-border px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Cookie Preferences
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Customize how we use cookies
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Analytics</p>
                      <p className="text-xs text-muted-foreground">
                        Help us improve our service
                      </p>
                    </div>
                    <CookieToggle
                      checked={consent.analytics}
                      onChange={toggleAnalytics}
                      label=""
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Preferences</p>
                      <p className="text-xs text-muted-foreground">
                        Remember your settings
                      </p>
                    </div>
                    <CookieToggle
                      checked={consent.personalization}
                      onChange={togglePersonalization}
                      label=""
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-9 text-xs"
                    onClick={hideExpanded}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" className="flex-1 h-9 text-xs" onClick={handleSave}>
                    Save
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main banner */}
        <div className="border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="hidden sm:flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Cookie className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm text-foreground truncate">
                We use cookies to enhance your experience. By continuing, you agree to our{" "}
                <a
                  href="/legal/cookies"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-muted-foreground inline-flex items-center gap-0.5"
                >
                  Cookie Policy
                  <ExternalLink className="h-3 w-3 inline" />
                </a>
                .
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground"
                onClick={handleManage}
              >
                Manage
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={handleReject}
              >
                Reject
              </Button>
              <Button size="sm" className="h-8 text-xs" onClick={handleAccept}>
                Accept
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
