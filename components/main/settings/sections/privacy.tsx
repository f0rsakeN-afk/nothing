"use client";

import * as React from "react";
import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Download, Trash2, Cookie } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/sileo-toast";
import { useCookieConsent } from "@/hooks/use-cookie-consent";
import { useHaptics } from "@/hooks/use-web-haptics";

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

interface Settings {
  analytics: boolean;
  usageData: boolean;
  crashReports: boolean;
}

async function fetchSettings(): Promise<Settings> {
  const res = await fetch("/api/settings");
  if (!res.ok) throw new Error("Failed to fetch settings");
  return res.json();
}

async function updateSetting(key: string, value: boolean): Promise<Settings> {
  const res = await fetch("/api/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ [key]: value }),
  });
  if (!res.ok) throw new Error("Failed to update settings");
  return res.json();
}

interface PrivacySectionProps {
  settings?: Settings;
}

export function PrivacySection({ settings: propSettings }: PrivacySectionProps) {
  const { trigger } = useHaptics();
  const queryClient = useQueryClient();
  const [localSettings, setLocalSettings] = React.useState<Settings | null>(null);
  const [deleteChatsOpen, setDeleteChatsOpen] = React.useState(false);
  const [deactivateOpen, setDeactivateOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const cookieConsent = useCookieConsent();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
    enabled: !propSettings,
    staleTime: 30000,
  });

  const mutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: boolean }) => {
      return updateSetting(key, value);
    },
    onSuccess: (newData) => {
      queryClient.setQueryData(["settings"], newData);
      setLocalSettings(newData);
    },
    onError: () => {
      toast.error("Failed to update privacy settings");
    },
  });

  const onUpdate = React.useCallback((key: keyof Settings, value: boolean) => {
    trigger("success");
    mutation.mutate({ key, value });
  }, [mutation, trigger]);

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const res = await fetch("/api/settings/export");
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `eryx-data-${new Date().toISOString().split("T")[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      trigger("success");
      toast.success("Data exported successfully");
    } catch {
      trigger("error");
      toast.error("Failed to export data");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteChats = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch("/api/settings/delete-chats", { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");

      trigger("success");
      toast.success("All conversations deleted");
      setDeleteChatsOpen(false);
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    } catch {
      trigger("error");
      toast.error("Failed to delete conversations");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeactivateAccount = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch("/api/settings/deactivate", { method: "POST" });
      if (!res.ok) throw new Error("Deactivate failed");

      trigger("success");
      toast.success("Account deactivated");
      setDeactivateOpen(false);
      // Redirect to home after deactivation
      window.location.href = "/";
    } catch {
      trigger("error");
      toast.error("Failed to deactivate account");
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteChatsDialog = useCallback(() => {
    setDeleteChatsOpen(true);
  }, []);

  const openDeactivateDialog = useCallback(() => {
    setDeactivateOpen(true);
  }, []);

  const updateAnalyticsConsent = useCallback(
    (val: boolean) => {
      trigger("success");
      cookieConsent.updateConsent({ ...cookieConsent.consent, analytics: val });
    },
    [cookieConsent, trigger]
  );

  const updatePersonalizationConsent = useCallback(
    (val: boolean) => {
      trigger("success");
      cookieConsent.updateConsent({ ...cookieConsent.consent, personalization: val });
    },
    [cookieConsent, trigger]
  );

  const displaySettings = localSettings || propSettings || settings;

  if ((!propSettings && isLoading) || !displaySettings) {
    return (
      <div className="space-y-5">
        <div>
          <Skeleton className="h-4 w-24 mb-1" />
          <Skeleton className="h-3 w-40" />
        </div>
        <div>
          <Skeleton className="h-3 w-28 mb-1" />
          <div className="rounded-lg border border-border/60 bg-muted/10 px-3 space-y-3">
            <div className="flex items-center justify-between py-3.5 border-b border-border/40">
              <div>
                <Skeleton className="h-3.5 w-20 mb-1" />
                <Skeleton className="h-3 w-56" />
              </div>
              <Skeleton className="h-5 w-9 rounded-full" />
            </div>
            <div className="flex items-center justify-between py-3.5 border-b border-border/40">
              <div>
                <Skeleton className="h-3.5 w-28 mb-1" />
                <Skeleton className="h-3 w-64" />
              </div>
              <Skeleton className="h-5 w-9 rounded-full" />
            </div>
            <div className="flex items-center justify-between py-3.5">
              <div>
                <Skeleton className="h-3.5 w-24 mb-1" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-5 w-9 rounded-full" />
            </div>
          </div>
        </div>
        <div>
          <Skeleton className="h-3 w-32 mb-1" />
          <div className="rounded-lg border border-border/60 bg-muted/10 px-3 space-y-3">
            <div className="flex items-center justify-between py-3.5 border-b border-border/40">
              <div>
                <Skeleton className="h-3.5 w-24 mb-1" />
                <Skeleton className="h-3 w-44" />
              </div>
              <Skeleton className="h-7 w-16 rounded-md" />
            </div>
            <div className="flex items-center justify-between py-3.5">
              <div>
                <Skeleton className="h-3.5 w-40 mb-1" />
                <Skeleton className="h-3 w-56" />
              </div>
              <Skeleton className="h-7 w-16 rounded-md" />
            </div>
          </div>
        </div>
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    );
  }

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
              checked={displaySettings.analytics}
              onCheckedChange={(val) => onUpdate("analytics", val)}
              size="sm"
            />
          </SettingRow>
          <SettingRow
            label="Share usage data"
            description="Allow anonymized conversation data to improve AI models."
          >
            <Switch
              checked={displaySettings.usageData}
              onCheckedChange={(val) => onUpdate("usageData", val)}
              size="sm"
            />
          </SettingRow>
          <SettingRow
            label="Crash reports"
            description="Automatically send error reports when something goes wrong."
          >
            <Switch
              checked={displaySettings.crashReports}
              onCheckedChange={(val) => onUpdate("crashReports", val)}
              size="sm"
            />
          </SettingRow>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60 mb-1">
          Cookies
        </p>
        <div className="rounded-lg border border-border/60 bg-muted/20 px-3 divide-y divide-border/40">
          <SettingRow
            label="Analytics cookies"
            description="Help us improve by tracking how you use the app."
          >
            <Switch
              checked={cookieConsent.consent.analytics}
              onCheckedChange={updateAnalyticsConsent}
              size="sm"
            />
          </SettingRow>
          <SettingRow
            label="Personalization cookies"
            description="Remember your preferences for better experience."
          >
            <Switch
              checked={cookieConsent.consent.personalization}
              onCheckedChange={updatePersonalizationConsent}
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
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[12px]"
              onClick={handleExportData}
              disabled={isExporting}
            >
              {isExporting ? (
                <>
                  <div className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30 border-t-primary animate-spin mr-1.5" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Export
                </>
              )}
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
              onClick={openDeleteChatsDialog}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Clear all
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3.5 flex gap-3">
        <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
        <div>
          <p className="text-[12.5px] font-medium text-foreground mb-0.5">
            Deactivate account
          </p>
          <p className="text-[12px] text-muted-foreground leading-snug mb-2.5">
            Deactivate your account. You can reactivate anytime by signing in.
          </p>
          <Button
            variant="destructive"
            size="sm"
            className="h-7 text-[12px] text-white"
            onClick={openDeactivateDialog}
          >
            Deactivate
          </Button>
        </div>
      </div>

      {/* Delete All Chats Confirmation */}
      <AlertDialog open={deleteChatsOpen} onOpenChange={setDeleteChatsOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10">
              <Trash2 className="size-5 text-destructive" />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete all conversations?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all your conversations and messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              render={<Button variant="destructive" />}
              onClick={handleDeleteChats}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete all"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deactivate Account Confirmation */}
      <AlertDialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10">
              <AlertTriangle className="size-5 text-destructive" />
            </AlertDialogMedia>
            <AlertDialogTitle>Deactivate your account?</AlertDialogTitle>
            <AlertDialogDescription>
              You can reactivate anytime by signing in. Your data will be preserved but your account will be deactivated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              render={<Button variant="destructive" />}
              onClick={handleDeactivateAccount}
              disabled={isDeleting}
            >
              {isDeleting ? "Deactivating..." : "Deactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
