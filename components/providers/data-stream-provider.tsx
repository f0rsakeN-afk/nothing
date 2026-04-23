'use client';

import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';

// Define custom data types for the data stream
export interface ElicitationData {
  elicitationId: string;
  serverName: string;
  message: string;
  mode: "form" | "url";
  requestedSchema?: unknown;
  url?: string;
}

export interface CustomDataTypes {
  'data-appendMessage': unknown;
  'data-chat_title': { title: string };
  'data-auto_routed_model': { model: string; route: string };
  'data-mcp_elicitation': ElicitationData;
  'data-mcp_elicitation_done': { elicitationId: string };
}

interface DataStreamContextValue {
  dataStream: Array<{ type: string; data?: unknown }>;
  setDataStream: React.Dispatch<React.SetStateAction<Array<{ type: string; data?: unknown }>>>;
}

const DataStreamContext = createContext<DataStreamContextValue | null>(null);

export function DataStreamProvider({ children }: { children: React.ReactNode }) {
  const [dataStream, setDataStream] = useState<Array<{ type: string; data?: unknown }>>([]);

  // Wrap in useCallback to ensure stable reference
  const stableSetDataStream = useCallback(setDataStream, []);

  const value = useMemo(() => ({ dataStream, setDataStream: stableSetDataStream }), [dataStream, stableSetDataStream]);

  return <DataStreamContext.Provider value={value}>{children}</DataStreamContext.Provider>;
}

export function useDataStream() {
  const context = useContext(DataStreamContext);
  // Return a no-op context if no provider is available (for backward compatibility)
  if (!context) {
    return {
      dataStream: [] as Array<{ type: string; data?: unknown }>,
      setDataStream: () => {},
    };
  }
  return context;
}
