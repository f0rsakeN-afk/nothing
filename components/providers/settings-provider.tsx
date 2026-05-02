"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Settings {
  mode: string;
  colorScheme: string;
  language: string;
  autoTitle: boolean;
  enterToSend: boolean;
  showSuggestions: boolean;
  compactMode: boolean;
  reducedMotion: boolean;
  streaming: boolean;
  codeHighlight: boolean;
  persistentMemory: boolean;
  emailUpdates: boolean;
  emailMarketing: boolean;
  browserNotifs: boolean;
  usageAlerts: boolean;
  analytics: boolean;
  usageData: boolean;
  crashReports: boolean;
  hapticsEnabled: boolean;
  showChips: boolean;
  showTagline: boolean;
  showMemory: boolean;
  showFiles: boolean;
  showApps: boolean;
  showSearch: boolean;
  showNewChat: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  mode: "system",
  colorScheme: "civic",
  language: "en",
  autoTitle: true,
  enterToSend: false,
  showSuggestions: true,
  compactMode: false,
  reducedMotion: false,
  streaming: true,
  codeHighlight: true,
  persistentMemory: false,
  emailUpdates: true,
  emailMarketing: false,
  browserNotifs: false,
  usageAlerts: true,
  analytics: true,
  usageData: false,
  crashReports: true,
  hapticsEnabled: true,
  showChips: true,
  showTagline: true,
  showMemory: true,
  showFiles: true,
  showApps: true,
  showSearch: true,
  showNewChat: true,
};

const STORAGE_KEY = "eryx-settings";

interface SettingsContextValue {
  settings: Settings;
  isLoading: boolean;
  isHydrated: boolean; // True once we've loaded from localStorage
  updateSetting: (key: keyof Settings, value: boolean | string) => void;
  isUpdating: boolean;
}

const SettingsContext = React.createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  isLoading: false,
  isHydrated: false,
  updateSetting: () => {},
  isUpdating: false,
});

export function useSettings() {
  return React.useContext(SettingsContext);
}

/**
 * Load settings from localStorage (synchronous, for instant render)
 */
function loadFromStorage(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {
    // localStorage error, use defaults
  }
  return DEFAULT_SETTINGS;
}

/**
 * Save settings to localStorage (synchronous)
 */
function saveToStorage(settings: Settings): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage error, ignore
  }
}

async function fetchSettings(): Promise<Settings> {
  const res = await fetch("/api/settings");
  if (!res.ok) throw new Error("Failed to fetch settings");
  return res.json();
}

async function updateSettingApi(
  key: string,
  value: boolean | string
): Promise<Settings> {
  const res = await fetch("/api/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ [key]: value }),
  });
  if (!res.ok) throw new Error("Failed to update settings");
  return res.json();
}

interface SettingsProviderProps {
  children: React.ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const queryClient = useQueryClient();

  // Load initial state from localStorage (synchronous, instant)
  const [localSettings, setLocalSettings] = React.useState<Settings>(() => loadFromStorage());
  const [isHydrated, setIsHydrated] = React.useState(false);

  // Mark as hydrated after first mount
  React.useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Fetch from API to get server-persisted settings
  const { data: serverSettings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false,
    // Don't show loading state - we already have localStorage data
    enabled: false, // Explicitly disable auto-fetch, we'll refetch after hydration
  });

  // After hydration, sync server settings with local state
  React.useEffect(() => {
    if (isHydrated && serverSettings) {
      // If server settings differ from localStorage, update both
      const local = localSettings;
      const merged = { ...DEFAULT_SETTINGS, ...serverSettings };

      // Check if any setting is actually different
      const hasChanged = Object.keys(merged).some(
        (key) => merged[key as keyof Settings] !== local[key as keyof Settings]
      );

      if (hasChanged) {
        setLocalSettings(merged);
        saveToStorage(merged);
      }
    }
  }, [isHydrated, serverSettings]);

  // For authenticated users, enable the query after hydration
  const { refetch } = useQuery({
    queryKey: ["settings-init"],
    queryFn: fetchSettings,
    staleTime: 60000,
    refetchOnWindowFocus: false,
    enabled: isHydrated, // Only fetch after hydration
  });

  const mutation = useMutation({
    mutationFn: async ({
      key,
      value,
    }: {
      key: keyof Settings;
      value: boolean | string;
    }) => updateSettingApi(key, value),
    onMutate: async ({ key, value }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["settings"] });

      // Snapshot the previous value
      const previousSettings = queryClient.getQueryData<Settings>(["settings"]);

      // Optimistically update localStorage AND local state
      const updated = { ...localSettings, [key]: value };
      saveToStorage(updated);
      setLocalSettings(updated);

      // Also update React Query cache
      queryClient.setQueryData<Settings>(["settings"], (old) =>
        old ? { ...old, [key]: value } : old
      );

      return { previousSettings };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousSettings) {
        const rollback = context.previousSettings;
        saveToStorage(rollback);
        setLocalSettings(rollback);
        queryClient.setQueryData(["settings"], rollback);
      }
    },
    onSettled: () => {
      // Refetch to ensure server state is accurate
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });

  const updateSetting = React.useCallback(
    (key: keyof Settings, value: boolean | string) => {
      mutation.mutate({ key, value });
    },
    [mutation]
  );

  return (
    <SettingsContext.Provider
      value={{
        settings: localSettings,
        isLoading,
        isHydrated,
        updateSetting,
        isUpdating: mutation.isPending,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}
