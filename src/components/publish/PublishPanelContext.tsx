"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

export type PublishPanelOptions = {
  clientSlug?: string;
};

type PublishPanelContextValue = {
  open: boolean;
  options: PublishPanelOptions;
  openPanel: (opts?: PublishPanelOptions) => void;
  closePanel: () => void;
};

const PublishPanelContext = createContext<PublishPanelContextValue | null>(null);

export function PublishPanelProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<PublishPanelOptions>({});

  const openPanel = useCallback((opts?: PublishPanelOptions) => {
    setOptions(opts ?? {});
    setOpen(true);
  }, []);

  const closePanel = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <PublishPanelContext.Provider value={{ open, options, openPanel, closePanel }}>
      {children}
    </PublishPanelContext.Provider>
  );
}

export function usePublishPanel() {
  const ctx = useContext(PublishPanelContext);
  if (!ctx) throw new Error("usePublishPanel must be used within PublishPanelProvider");
  return ctx;
}
