'use client';

import React, { createContext, useContext, useMemo, useState } from 'react';

// Define custom data types for the data stream
export interface CustomDataTypes {
  'data-appendMessage': unknown;
  'data-chat_title': { title: string };
  'data-auto_routed_model': { model: string; route: string };
}

interface DataStreamContextValue {
  dataStream: Array<{ type: string; data?: unknown }>;
  setDataStream: React.Dispatch<React.SetStateAction<Array<{ type: string; data?: unknown }>>>;
}

const DataStreamContext = createContext<DataStreamContextValue | null>(null);

export function DataStreamProvider({ children }: { children: React.ReactNode }) {
  const [dataStream, setDataStream] = useState<Array<{ type: string; data?: unknown }>>([]);

  const value = useMemo(() => ({ dataStream, setDataStream }), [dataStream]);

  return <DataStreamContext.Provider value={value}>{children}</DataStreamContext.Provider>;
}

export function useDataStream() {
  const context = useContext(DataStreamContext);
  if (!context) {
    throw new Error('useDataStream must be used within a DataStreamProvider');
  }
  return context;
}
