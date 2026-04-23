'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

export interface ElicitationData {
  elicitationId: string;
  serverName: string;
  message: string;
  mode: "form" | "url";
  requestedSchema?: unknown;
  url?: string;
}

interface ElicitationContextValue {
  activeElicitation: ElicitationData | null;
  setActiveElicitation: (elicitation: ElicitationData | null) => void;
  dismissedIds: Set<string>;
  addDismissedId: (id: string) => void;
  removeDismissedId: (id: string) => void;
}

const ElicitationContext = createContext<ElicitationContextValue | null>(null);

export function ElicitationProvider({ children }: { children: React.ReactNode }) {
  const [activeElicitation, setActiveElicitation] = useState<ElicitationData | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const addDismissedId = useCallback((id: string) => {
    setDismissedIds(prev => new Set(prev).add(id));
  }, []);

  const removeDismissedId = useCallback((id: string) => {
    setDismissedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const value = useMemo(() => ({
    activeElicitation,
    setActiveElicitation,
    dismissedIds,
    addDismissedId,
    removeDismissedId,
  }), [activeElicitation, dismissedIds, addDismissedId, removeDismissedId]);

  return (
    <ElicitationContext.Provider value={value}>
      {children}
    </ElicitationContext.Provider>
  );
}

export function useElicitation() {
  const context = useContext(ElicitationContext);
  if (!context) {
    return {
      activeElicitation: null,
      setActiveElicitation: () => {},
      dismissedIds: new Set<string>(),
      addDismissedId: () => {},
      removeDismissedId: () => {},
    };
  }
  return context;
}