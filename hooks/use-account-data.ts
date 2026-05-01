/**
 * useAccountData - Hook for fetching and caching account data
 *
 * Uses sessionStorage for client-side caching to minimize API calls
 * Server already has Redis caching, this adds sessionStorage layer
 * to avoid redundant fetches within the same browser session
 *
 * @param options.sessionTimeout - How long to cache in sessionStorage (default: 60s)
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export interface AccountData {
  profile: {
    id: string;
    email: string;
    name: string;
    createdAt: string;
    isActive: boolean;
  };
  plan: {
    name: string;
    displayName: string;
    tier: string;
    credits: number;
    totalCredits: number;
    limits: {
      chats: string | number;
      projects: string | number;
      messages: string | number;
    };
    limitsDetail: {
      maxMemoryItems: number;
      maxBranchesPerChat: number;
      maxFolders: number;
      maxAttachmentsPerChat: number;
      maxFileSizeMb: number;
      canExport: boolean;
      canApiAccess: boolean;
      maxChatBranches: number;
      hasFolders: boolean;
      hasBranches: boolean;
    };
    features: string[];
  };
  subscription: {
    active: boolean;
    status?: string;
    periodEnd?: string;
    cancelAtPeriodEnd?: boolean;
  };
  usage: {
    chats: number;
    projects: number;
    messages: number;
    files: number;
    memories: number;
  };
  monthlyUsage: {
    chats: number;
    messages: number;
  };
  limits: {
    chats: number;
    projects: number;
    messages: number;
  };
  resetDate?: string;
}

const SESSION_KEY = "eryx_account_data";
const DEFAULT_TIMEOUT = 60 * 1000; // 60 seconds

interface UseAccountDataOptions {
  /** How long to cache in sessionStorage (ms) */
  sessionTimeout?: number;
  /** Enable sessionStorage caching (default: true) */
  useSessionCache?: boolean;
}

function getSessionCache(): { data: AccountData | null; timestamp: number } {
  if (typeof window === "undefined") return { data: null, timestamp: 0 };

  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return { data: null, timestamp: 0 };

    const parsed = JSON.parse(raw);
    return {
      data: parsed.data,
      timestamp: parsed.timestamp || 0,
    };
  } catch {
    return { data: null, timestamp: 0 };
  }
}

function setSessionCache(data: AccountData, timeout: number): void {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        data,
        timestamp: Date.now() + timeout,
      })
    );
  } catch {
    // sessionStorage full or unavailable
  }
}

function clearSessionCache(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {}
}

async function fetchAccount(): Promise<AccountData> {
  const res = await fetch("/api/account", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch account");
  return res.json();
}

export function useAccountData(options: UseAccountDataOptions = {}) {
  const { sessionTimeout = DEFAULT_TIMEOUT, useSessionCache = true } = options;
  const queryClient = useQueryClient();
  const [sessionData, setSessionData] = useState<AccountData | null>(null);
  const fetchedRef = useRef(false);

  // Try to get initial data from sessionStorage (only on client, only once)
  useEffect(() => {
    if (!useSessionCache || fetchedRef.current) return;
    fetchedRef.current = true;

    const cached = getSessionCache();
    if (cached.data && cached.timestamp > Date.now()) {
      setSessionData(cached.data);
    }
  }, [useSessionCache]);

  // React Query for server-fetching + caching
  const query = useQuery({
    queryKey: ["account"],
    queryFn: fetchAccount,
    staleTime: 60 * 1000, // 60 seconds - match server Redis cache
    gcTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: sessionData ? (old) => old : undefined,
  });

  // Update sessionStorage when we get fresh data
  useEffect(() => {
    if (query.data && useSessionCache) {
      setSessionCache(query.data, sessionTimeout);
      setSessionData(query.data);
    }
  }, [query.data, useSessionCache, sessionTimeout]);

  // Invalidate cache (call this when you know data changed)
  const invalidate = useCallback(() => {
    clearSessionCache();
    setSessionData(null);
    queryClient.invalidateQueries({ queryKey: ["account"] });
  }, [queryClient]);

  // Force refresh
  const refetch = useCallback(async () => {
    clearSessionCache();
    setSessionData(null);
    return queryClient.invalidateQueries({ queryKey: ["account"] });
  }, [queryClient]);

  return {
    // Data (from session cache or fresh fetch) - undefined if not yet loaded
    data: query.data ?? sessionData ?? undefined,
    // Loading states
    isLoading: query.isLoading && !sessionData && !query.data,
    isFetching: query.isFetching,
    // Whether data is stale (older than sessionTimeout)
    isStale: sessionData ? Date.now() > getSessionCache().timestamp : true,
    // Functions
    invalidate,
    refetch,
    // Error
    error: query.error,
  };
}

/**
 * Hook to get just the limits info (lighter than full account data)
 * Use this when you only need to check if user can perform an action
 */
export function useAccountLimits() {
  const { data, isLoading } = useAccountData();

  return {
    limits: data?.limits || null,
    usage: data?.usage || null,
    plan: data?.plan || null,
    isLoading,
  };
}

/**
 * Hook to check if user is approaching limit
 * Returns warning info if within 20% of limit
 */
export function useLimitWarning(feature: "chats" | "projects" | "messages") {
  const { limits, usage, plan, isLoading } = useAccountLimits();

  if (isLoading || !limits || !usage) {
    return { warning: null, isLoading: true };
  }

  const limit = limits[feature];
  const used = usage[feature === "messages" ? "messages" : feature];

  // limit can be number or "unlimited" string
  if (typeof limit === "string" || limit === -1) {
    return { warning: null, isLoading: false };
  }

  const percentage = (used / limit) * 100;
  const isWarning = percentage >= 80;
  const isExceeded = percentage >= 100;

  return {
    warning: isWarning
      ? {
          percentage: Math.round(percentage),
          remaining: Math.max(0, limit - used),
          used,
          limit,
          isExceeded,
          upgradeTo: getUpgradeSuggestion(plan?.tier),
        }
      : null,
    isLoading: false,
  };
}

function getUpgradeSuggestion(currentTier?: string): string | undefined {
  const tierOrder = ["FREE", "BASIC", "PRO", "ENTERPRISE"];
  const currentIndex = currentTier ? tierOrder.indexOf(currentTier) : 0;
  if (currentIndex < tierOrder.length - 1) {
    return tierOrder[currentIndex + 1];
  }
  return undefined;
}