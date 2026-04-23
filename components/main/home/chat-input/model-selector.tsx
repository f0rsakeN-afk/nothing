"use client";

import * as React from "react";
import { Cpu, Loader2, Check, Zap, Eye, Brain, Search, ChevronDown, Lock } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import type { ModelProvider } from "@/lib/ai/providers";

interface Model {
  value: string;
  label: string;
  provider: ModelProvider;
  description?: string;
  capabilities?: {
    fast?: boolean;
    vision?: boolean;
    reasoning?: boolean;
    pdf?: boolean;
  };
  isNew?: boolean;
  tier?: 'free' | 'pro' | 'max';
  locked?: boolean;
  upgradeTo?: 'pro' | 'max';
}

interface ModelSelectorProps {
  currentModel?: string;
  onModelChange?: (model: string) => void;
}

async function fetchModels(): Promise<{ models: Model[]; userTier: string }> {
  const res = await fetch("/api/models");
  if (!res.ok) throw new Error("Failed to fetch models");
  return res.json();
}

// Provider display names
const PROVIDER_NAMES: Record<ModelProvider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  xai: 'xAI',
  google: 'Google',
  alibaba: 'Alibaba',
  mistral: 'Mistral',
  deepseek: 'DeepSeek',
  zhipu: 'Zhipu',
  cohere: 'Cohere',
  moonshot: 'Moonshot',
  minimax: 'MiniMax',
  bytedance: 'ByteDance',
  arcee: 'Arcee',
  vercel: 'Vercel',
  amazon: 'Amazon',
  xiaomi: 'Xiaomi',
  kwaipilot: 'Kwaipilot',
  stepfun: 'StepFun',
  inception: 'Inception',
  nvidia: 'NVIDIA',
};

export function ModelSelector({ currentModel, onModelChange }: ModelSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["models"],
    queryFn: fetchModels,
    staleTime: Infinity,
  });

  const models = data?.models || [];
  const userTier = data?.userTier || 'free';

  const current = models.find((m) => m.value === (currentModel || "gpt-4.1-mini")) || models[0];

  // Group models by provider
  const groupedModels = React.useMemo(() => {
    const groups: Record<string, Model[]> = {};
    const filtered = searchQuery
      ? models.filter((m) =>
          m.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.description?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : models;

    for (const model of filtered) {
      if (!groups[model.provider]) {
        groups[model.provider] = [];
      }
      groups[model.provider].push(model);
    }
    return groups;
  }, [models, searchQuery]);

  const handleSelect = (model: Model) => {
    if (model.locked) return;
    onModelChange?.(model.value);
    setOpen(false);
    setSearchQuery("");
  };

  const handleUpgradeClick = (upgradeTo: 'pro' | 'max') => {
    // Dispatch event to open pricing dialog
    window.dispatchEvent(new CustomEvent("open-pricing-dialog"));
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[12px] transition-all duration-150 relative",
          currentModel && currentModel !== "gpt-4.1-mini"
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground/60 hover:text-foreground hover:bg-muted/70",
          open && "ring-2 ring-primary/30"
        )}
      >
        <Cpu className="h-3.5 w-3.5" />
        <span className="font-medium">{current?.label || "Model"}</span>
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
        {open && (
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-primary rounded-full" />
        )}
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={8}
        className="w-80 p-0 max-h-[320px] overflow-hidden flex flex-col"
      >
        {/* Search */}
        <div className="p-2 border-b border-border/40">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
            <input
              type="text"
              placeholder="Search models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "w-full pl-8 pr-3 py-1.5 text-xs rounded-lg",
                "bg-secondary/30 border border-border/40",
                "focus:outline-none focus:ring-2 focus:ring-primary/20",
                "placeholder:text-muted-foreground/50"
              )}
            />
          </div>
        </div>

        {/* Model List */}
        <div className="flex-1 overflow-y-auto p-1.5 hide-scrollbar">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            Object.entries(groupedModels).map(([provider, providerModels]) => (
              <div key={provider} className="mb-2 last:mb-0">
                {/* Provider Header */}
                <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {PROVIDER_NAMES[provider as ModelProvider] || provider}
                </div>

                {/* Models */}
                {providerModels.map((model) => (
                  <div
                    key={model.value}
                    onClick={() => handleSelect(model)}
                    className={cn(
                      "flex items-center justify-between w-full px-2 py-2 text-[13px] rounded-md transition-all cursor-pointer",
                      model.locked
                        ? "opacity-50 cursor-not-allowed hover:bg-muted/30"
                        : "hover:bg-muted/70",
                      currentModel === model.value && !model.locked && "bg-primary/10 text-primary"
                    )}
                  >
                    <div className="flex flex-col items-start gap-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={cn("font-medium truncate", model.locked && "text-muted-foreground")}>
                          {model.label}
                        </span>
                        {model.isNew && (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                            NEW
                          </span>
                        )}
                        {model.locked && (
                          <Lock className="h-3 w-3 text-muted-foreground/50" />
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground/70 truncate">
                        {model.description}
                      </span>
                      {model.locked && model.upgradeTo && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpgradeClick(model.upgradeTo!);
                          }}
                          className="text-[10px] text-primary hover:underline font-medium"
                        >
                          Upgrade to {model.upgradeTo === 'pro' ? 'Pro' : 'Max'}
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      {/* Capability icons */}
                      {!model.locked && (
                        <>
                          {model.capabilities?.fast && (
                            <Zap className="h-3 w-3 text-amber-500/70" />
                          )}
                          {model.capabilities?.vision && (
                            <Eye className="h-3 w-3 text-muted-foreground/50" />
                          )}
                          {model.capabilities?.reasoning && (
                            <Brain className="h-3 w-3 text-muted-foreground/50" />
                          )}
                        </>
                      )}

                      {/* Selected check */}
                      {currentModel === model.value && !model.locked && (
                        <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-2.5 w-2.5 text-primary-foreground" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}

          {!isLoading && Object.keys(groupedModels).length === 0 && (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <Search className="h-5 w-5 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground/60">No models found</p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
