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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CreditCard,
  Check,
  X,
  Loader2,
  Zap,
  Crown,
  Rocket,
  Star,
  Edit,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Plan {
  id: string;
  tier: string;
  name: string;
  description: string;
  price: number;
  credits: number;
  maxChats: number;
  maxProjects: number;
  maxMessages: number;
  maxMemoryItems: number;
  maxBranchesPerChat: number;
  maxFolders: number;
  maxAttachmentsPerChat: number;
  maxFileSizeMb: number;
  canExport: boolean;
  canApiAccess: boolean;
  features: string[];
  sortOrder: number;
  isActive: boolean;
  isVisible: boolean;
  isDefault: boolean;
  polarProductId?: string;
  polarPriceId?: string;
}

const TIER_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  FREE: { icon: Star, color: "text-muted-foreground", bg: "bg-muted" },
  BASIC: { icon: Rocket, color: "text-green-600", bg: "bg-green-500/10" },
  PRO: { icon: Zap, color: "text-primary", bg: "bg-primary/10" },
  ENTERPRISE: { icon: Crown, color: "text-purple-600", bg: "bg-purple-500/10" },
};

async function getPlans(): Promise<{ plans: Plan[] }> {
  const res = await fetch("/api/admin/plans");
  if (!res.ok) throw new Error("Failed to fetch plans");
  return res.json();
}

async function updatePlan(id: string, data: Partial<Plan>): Promise<{ plan: Plan }> {
  const res = await fetch(`/api/admin/plans/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to update plan");
  }
  return res.json();
}

function PlanCard({ plan }: { plan: Plan }) {
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({
    name: plan.name,
    description: plan.description,
    price: plan.price,
    credits: plan.credits,
    maxChats: plan.maxChats,
    maxProjects: plan.maxProjects,
    maxMessages: plan.maxMessages,
    maxMemoryItems: plan.maxMemoryItems,
    maxBranchesPerChat: plan.maxBranchesPerChat,
    maxFolders: plan.maxFolders,
    canExport: plan.canExport,
    canApiAccess: plan.canApiAccess,
    isActive: plan.isActive,
    isVisible: plan.isVisible,
    polarProductId: (plan as Plan & { polarProductId?: string }).polarProductId || "",
    polarPriceId: (plan as Plan & { polarPriceId?: string }).polarPriceId || "",
  });

  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (data: Partial<Plan>) => updatePlan(plan.id, data),
    onSuccess: (result) => {
      toast.success(`${plan.tier} plan updated`);
      queryClient.invalidateQueries({ queryKey: ["admin", "plans"] });
      setEditOpen(false);
    },
    onError: (err: Error) => {
      toast.error("Failed to update", { description: err.message });
    },
  });

  const tierConfig = TIER_CONFIG[plan.tier] || TIER_CONFIG.FREE;
  const Icon = tierConfig.icon;

  const formatPrice = (cents: number) => {
    if (cents === 0) return "Free";
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatLimit = (val: number) => {
    if (val === -1) return "∞";
    if (val === 0) return "—";
    return val.toString();
  };

  return (
    <>
      <Card className="relative overflow-hidden">
        {plan.isDefault && (
          <div className="absolute top-3 right-3">
            <Badge className="bg-primary/10 text-primary text-[10px]">Default</Badge>
          </div>
        )}
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", tierConfig.bg)}>
              <Icon className={cn("h-5 w-5", tierConfig.color)} />
            </div>
            <div>
              <CardTitle className="text-base">{plan.name}</CardTitle>
              <CardDescription className="text-xs">{plan.tier} Plan</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold">{formatPrice(plan.price)}</span>
            <span className="text-sm text-muted-foreground">/mo</span>
          </div>

          <p className="text-xs text-muted-foreground line-clamp-2">{plan.description}</p>

          <Separator />

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Chats</span>
              <span className="font-medium">{formatLimit(plan.maxChats)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Projects</span>
              <span className="font-medium">{formatLimit(plan.maxProjects)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Credits</span>
              <span className="font-medium">{formatLimit(plan.credits)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Memory</span>
              <span className="font-medium">{formatLimit(plan.maxMemoryItems)}</span>
            </div>
          </div>

          {plan.features.length > 0 && (
            <>
              <Separator />
              <div className="space-y-1">
                {plan.features.slice(0, 4).map((f) => (
                  <div key={f} className="flex items-center gap-2 text-xs">
                    <Check className="h-3 w-3 text-green-500 shrink-0" />
                    <span className="text-muted-foreground">{f}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Active</span>
              <div className={cn("h-2 w-2 rounded-full", plan.isActive ? "bg-green-500" : "bg-muted")} />
            </div>
            <Button variant="ghost" size="sm" className="h-8 gap-1" onClick={() => setEditOpen(true)}>
              <Edit className="h-3 w-3" />
              Edit
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit {plan.tier} Plan</DialogTitle>
            <DialogDescription>Update plan pricing and limits</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2">
              <label className="text-sm font-medium">Plan Name</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Price (cents)</label>
              <Input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: parseInt(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Credits</label>
              <Input
                type="number"
                value={form.credits}
                onChange={(e) => setForm({ ...form, credits: parseInt(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Max Chats (-1=unlimited)</label>
              <Input
                type="number"
                value={form.maxChats}
                onChange={(e) => setForm({ ...form, maxChats: parseInt(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Max Projects</label>
              <Input
                type="number"
                value={form.maxProjects}
                onChange={(e) => setForm({ ...form, maxProjects: parseInt(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Max Messages</label>
              <Input
                type="number"
                value={form.maxMessages}
                onChange={(e) => setForm({ ...form, maxMessages: parseInt(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Max Memory Items</label>
              <Input
                type="number"
                value={form.maxMemoryItems}
                onChange={(e) => setForm({ ...form, maxMemoryItems: parseInt(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Max Folders</label>
              <Input
                type="number"
                value={form.maxFolders}
                onChange={(e) => setForm({ ...form, maxFolders: parseInt(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Max Branches/Chat</label>
              <Input
                type="number"
                value={form.maxBranchesPerChat}
                onChange={(e) => setForm({ ...form, maxBranchesPerChat: parseInt(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
            <div className="col-span-2 flex items-center justify-between py-2 border-t">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">Active</span>
                <span className="text-xs text-muted-foreground">Plan available for selection</span>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
              />
            </div>
            <div className="col-span-2 flex items-center justify-between py-2 border-t">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">Visible</span>
                <span className="text-xs text-muted-foreground">Show on pricing page</span>
              </div>
              <Switch
                checked={form.isVisible}
                onCheckedChange={(checked) => setForm({ ...form, isVisible: checked })}
              />
            </div>
            <div className="col-span-2 border-t pt-4">
              <label className="text-sm font-medium">Polar Product ID</label>
              <Input
                value={form.polarProductId}
                onChange={(e) => setForm({ ...form, polarProductId: e.target.value })}
                placeholder="polar_prod_xxx"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Used for subscription checkout</p>
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">Polar Price ID</label>
              <Input
                value={form.polarPriceId}
                onChange={(e) => setForm({ ...form, polarPriceId: e.target.value })}
                placeholder="polar_price_xxx"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Overrides Polar Product ID if set</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={() => mutation.mutate(form)} disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function PlansPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "plans"],
    queryFn: getPlans,
    staleTime: 60 * 1000,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Plans & Pricing</h1>
            <p className="text-sm text-muted-foreground">Manage subscription plans and limits</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {data?.plans?.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      )}
    </div>
  );
}
