"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export interface SplitViewData {
  title?: string;
  description?: string;
  rawData: string;
}

interface SplitViewContextType {
  splitView: SplitViewData | null;
  openSplitView: (data: SplitViewData) => void;
  closeSplitView: () => void;
}

const SplitViewContext = createContext<SplitViewContextType | null>(null);

export function SplitViewProvider({ children }: { children: ReactNode }) {
  const [splitView, setSplitView] = useState<SplitViewData | null>(null);

  return (
    <SplitViewContext.Provider
      value={{
        splitView,
        openSplitView: setSplitView,
        closeSplitView: () => setSplitView(null),
      }}
    >
      {children}
    </SplitViewContext.Provider>
  );
}

/** Returns null when used outside a SplitViewProvider — safe to call anywhere. */
export function useSplitView(): SplitViewContextType | null {
  return useContext(SplitViewContext);
}
