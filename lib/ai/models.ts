import { useQuery } from "@tanstack/react-query";
import type { ModelProvider } from '@/lib/ai/providers';

export interface Model {
  value: string;
  label: string;
  provider: ModelProvider;
  description?: string;
  openAIModel?: string;
  capabilities?: {
    fast?: boolean;
    vision?: boolean;
    reasoning?: boolean;
    pdf?: boolean;
  };
  isNew?: boolean;
}

export interface PROVIDERS {
  [key: string]: {
    name: string;
    hasNew?: boolean;
  };
}

export const PROVIDERS: PROVIDERS = {
  openai: { name: 'OpenAI' },
  anthropic: { name: 'Anthropic' },
  xai: { name: 'xAI' },
  google: { name: 'Google' },
  alibaba: { name: 'Alibaba' },
  mistral: { name: 'Mistral' },
  deepseek: { name: 'DeepSeek' },
  zhipu: { name: 'Zhipu' },
  cohere: { name: 'Cohere' },
  moonshot: { name: 'Moonshot' },
  minimax: { name: 'MiniMax' },
  bytedance: { name: 'ByteDance' },
  arcee: { name: 'Arcee' },
  vercel: { name: 'Vercel' },
  amazon: { name: 'Amazon' },
  xiaomi: { name: 'Xiaomi' },
  kwaipilot: { name: 'Kwaipilot' },
  stepfun: { name: 'StepFun' },
  inception: { name: 'Inception' },
  nvidia: { name: 'NVIDIA' },
};

export function getModelProvider(_value: string, _label: string): ModelProvider {
  return 'openai';
}

export function requiresAuthentication(_modelValue: string): boolean {
  return false;
}

export function requiresProSubscription(_modelValue: string): boolean {
  return false;
}

export function requiresMaxSubscription(_modelValue: string): boolean {
  return false;
}

async function fetchModelsAPI(): Promise<Model[]> {
  const res = await fetch("/api/models");
  if (!res.ok) throw new Error("Failed to fetch models");
  const data = await res.json();
  return data.models || [];
}

export function useModels() {
  return useQuery({
    queryKey: ["models"],
    queryFn: fetchModelsAPI,
    staleTime: Infinity,
  });
}

export function getFilteredModels(): Model[] {
  return [];
}

export const models: Model[] = [];
