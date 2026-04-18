"use client";

import * as React from "react";

interface CreateProjectDialogContextValue {
  openCreateProjectDialog: () => void;
}

const CreateProjectDialogContext = React.createContext<CreateProjectDialogContextValue | null>(null);

export function CreateProjectDialogProvider({
  children,
  onOpenCreateProject,
}: {
  children: React.ReactNode;
  onOpenCreateProject: () => void;
}) {
  const value = React.useMemo(() => ({
    openCreateProjectDialog: onOpenCreateProject,
  }), [onOpenCreateProject]);

  return (
    <CreateProjectDialogContext.Provider value={value}>
      {children}
    </CreateProjectDialogContext.Provider>
  );
}

export function useCreateProjectDialog(): CreateProjectDialogContextValue {
  const context = React.useContext(CreateProjectDialogContext);
  if (!context) {
    return { openCreateProjectDialog: () => {} };
  }
  return context;
}
