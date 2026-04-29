"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/sileo-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  Settings,
  Shield,
  Mail,
  Globe,
  Bell,
  CheckCircle,
  Loader2,
  RefreshCw,
  Coins,
  Plus,
  Trash2,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsResponse {
  settings: Record<string, string>;
}

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  amount: number;
  polarProductId?: string;
}

interface CreditCost {
  operation: string;
  credits: number;
  description: string;
}

async function getSettings(): Promise<SettingsResponse> {
  const res = await fetch("/api/admin/settings");
  if (!res.ok) throw new Error("Failed to fetch settings");
  return res.json();
}

async function updateSettings(settings: Record<string, string>): Promise<SettingsResponse> {
  const res = await fetch("/api/admin/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ settings }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to update settings");
  }
  return res.json();
}

function parseCreditPackages(json: string): CreditPackage[] {
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

function parseCreditCosts(json: string): CreditCost[] {
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

interface SettingRowProps {
  label: string;
  description?: string;
  value: string;
  type?: "text" | "number" | "boolean";
  onChange: (value: string) => void;
  disabled?: boolean;
}

function SettingRow({ label, description, value, type = "text", onChange, disabled }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {description && <span className="text-xs text-muted-foreground">{description}</span>}
      </div>
      <div className="flex items-center gap-2">
        {type === "boolean" ? (
          <Switch
            checked={value === "true"}
            onCheckedChange={(checked) => onChange(checked ? "true" : "false")}
            disabled={disabled}
          />
        ) : type === "number" ? (
          <Input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-24 h-8"
            disabled={disabled}
          />
        ) : (
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-64 h-8"
            disabled={disabled}
          />
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [hasChanges, setHasChanges] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: getSettings,
    staleTime: 60 * 1000,
  });

  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});

  const handleSettingChange = useCallback((key: string, value: string) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }, []);

  const updateMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: (result) => {
      toast.success("Settings saved");
      setLocalSettings(result.settings);
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
    onError: (err: Error) => {
      toast.error("Failed to save", { description: err.message });
    },
  });

  const handleSave = useCallback(() => {
    updateMutation.mutate(localSettings);
  }, [localSettings, updateMutation]);

  const settings = { ...(data?.settings ?? {}), ...localSettings };

  const creditPackages = parseCreditPackages(settings.credit_packages || "[]");
  const creditCosts = parseCreditCosts(settings.credit_costs || "[]");

  const sections = [
    {
      title: "Maintenance",
      icon: AlertTriangle,
      color: "text-red-500",
      items: [
        {
          key: "maintenance_mode",
          label: "Maintenance Mode",
          description: "When enabled, non-admin users will see a maintenance page",
          type: "boolean" as const,
        },
        {
          key: "maintenance_message",
          label: "Maintenance Message",
          description: "Message shown to users during maintenance",
          type: "text" as const,
        },
      ],
    },
    {
      title: "Registration & Access",
      icon: Shield,
      color: "text-blue-500",
      items: [
        {
          key: "allow_signups",
          label: "Allow New Signups",
          description: "Allow new users to create accounts",
          type: "boolean" as const,
        },
        {
          key: "require_email_verification",
          label: "Require Email Verification",
          description: "New users must verify their email before using the app",
          type: "boolean" as const,
        },
        {
          key: "max_users",
          label: "Max Users",
          description: "Maximum number of users allowed (0 = unlimited)",
          type: "number" as const,
        },
      ],
    },
    {
      title: "Notifications",
      icon: Bell,
      color: "text-amber-500",
      items: [
        {
          key: "email_notifications",
          label: "Email Notifications",
          description: "Send email notifications to users for important events",
          type: "boolean" as const,
        },
        {
          key: "push_notifications",
          label: "Push Notifications",
          description: "Enable browser push notifications",
          type: "boolean" as const,
        },
      ],
    },
    {
      title: "Platform",
      icon: Globe,
      color: "text-green-500",
      items: [
        {
          key: "platform_name",
          label: "Platform Name",
          description: "Display name for the platform",
          type: "text" as const,
        },
        {
          key: "support_email",
          label: "Support Email",
          description: "Contact email shown to users",
          type: "text" as const,
        },
        {
          key: "terms_url",
          label: "Terms of Service URL",
          type: "text" as const,
        },
        {
          key: "privacy_url",
          label: "Privacy Policy URL",
          type: "text" as const,
        },
      ],
    },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Settings</h1>
            <p className="text-sm text-muted-foreground">Configure global platform settings</p>
          </div>
        </div>
        {hasChanges && (
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="gap-2"
          >
            {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Save Changes
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Card key={section.title}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Icon className={cn("h-4 w-4", section.color)} />
                    <CardTitle className="text-base">{section.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="px-6">
                  {section.items.map((item, idx) => (
                    <>
                      <SettingRow
                        key={item.key}
                        label={item.label}
                        description={item.description}
                        value={settings[item.key] ?? ""}
                        type={item.type}
                        onChange={(val) => handleSettingChange(item.key, val)}
                        disabled={updateMutation.isPending}
                      />
                      {idx < section.items.length - 1 && <Separator />}
                    </>
                  ))}
                </CardContent>
              </Card>
            );
          })}

          {/* Credit Packages */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-amber-500" />
                  <CardTitle className="text-base">Credit Packages</CardTitle>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    const nextPackages = [
                      ...creditPackages,
                      {
                        id: `pkg_${Date.now()}`,
                        name: "",
                        credits: 0,
                        amount: 0,
                        polarProductId: "",
                      },
                    ];
                    handleSettingChange("credit_packages", JSON.stringify(nextPackages));
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Package
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {creditPackages.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No credit packages configured. Click "Add Package" to create one.
                </p>
              ) : (
                creditPackages.map((pkg, idx) => (
                  <div key={pkg.id} className="grid grid-cols-4 gap-3 items-end">
                    <div className="col-span-1">
                      <label className="text-xs text-muted-foreground">Name</label>
                      <Input
                        value={pkg.name}
                        onChange={(e) => {
                          const next = [...creditPackages];
                          next[idx] = { ...next[idx], name: e.target.value };
                          handleSettingChange("credit_packages", JSON.stringify(next));
                        }}
                        placeholder="Starter"
                        className="h-8"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Credits</label>
                      <Input
                        type="number"
                        value={pkg.credits}
                        onChange={(e) => {
                          const next = [...creditPackages];
                          next[idx] = { ...next[idx], credits: parseInt(e.target.value) || 0 };
                          handleSettingChange("credit_packages", JSON.stringify(next));
                        }}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Price (cents)</label>
                      <Input
                        type="number"
                        value={pkg.amount}
                        onChange={(e) => {
                          const next = [...creditPackages];
                          next[idx] = { ...next[idx], amount: parseInt(e.target.value) || 0 };
                          handleSettingChange("credit_packages", JSON.stringify(next));
                        }}
                        className="h-8"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        value={pkg.polarProductId || ""}
                        onChange={(e) => {
                          const next = [...creditPackages];
                          next[idx] = { ...next[idx], polarProductId: e.target.value };
                          handleSettingChange("credit_packages", JSON.stringify(next));
                        }}
                        placeholder="polar_prod_xxx"
                        className="h-8"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          const next = creditPackages.filter((_, i) => i !== idx);
                          handleSettingChange("credit_packages", JSON.stringify(next));
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Credit Costs */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">Credit Costs</CardTitle>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    const nextCosts = [
                      ...creditCosts,
                      { operation: "", credits: 1, description: "" },
                    ];
                    handleSettingChange("credit_costs", JSON.stringify(nextCosts));
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Operation
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {creditCosts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No credit costs configured. Click "Add Operation" to create one.
                </p>
              ) : (
                creditCosts.map((cost, idx) => (
                  <div key={idx} className="grid grid-cols-3 gap-3 items-end">
                    <div>
                      <label className="text-xs text-muted-foreground">Operation</label>
                      <Input
                        value={cost.operation}
                        onChange={(e) => {
                          const next = [...creditCosts];
                          next[idx] = { ...next[idx], operation: e.target.value };
                          handleSettingChange("credit_costs", JSON.stringify(next));
                        }}
                        placeholder="gpt-4o"
                        className="h-8"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Credits</label>
                      <Input
                        type="number"
                        value={cost.credits}
                        onChange={(e) => {
                          const next = [...creditCosts];
                          next[idx] = { ...next[idx], credits: parseInt(e.target.value) || 0 };
                          handleSettingChange("credit_costs", JSON.stringify(next));
                        }}
                        className="h-8"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        value={cost.description}
                        onChange={(e) => {
                          const next = [...creditCosts];
                          next[idx] = { ...next[idx], description: e.target.value };
                          handleSettingChange("credit_costs", JSON.stringify(next));
                        }}
                        placeholder="Description (optional)"
                        className="h-8"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          const next = creditCosts.filter((_, i) => i !== idx);
                          handleSettingChange("credit_costs", JSON.stringify(next));
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-6 space-y-4">
              <div className="flex items-center justify-between py-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">Reset All Settings</span>
                  <span className="text-xs text-muted-foreground">
                    Reset all settings to their default values
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-destructive/50 text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    if (confirm("Reset all settings to defaults?")) {
                      setLocalSettings({});
                      setHasChanges(false);
                      toast.success("Settings reset to defaults");
                    }
                  }}
                >
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
