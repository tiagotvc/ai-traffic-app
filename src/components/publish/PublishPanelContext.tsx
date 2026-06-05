"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

import { useRouter } from "@/i18n/navigation";

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
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<PublishPanelOptions>({});

  // O criador de campanhas agora é uma página cheia (/ads/new) em vez de drawer.
  const openPanel = useCallback(
    (opts?: PublishPanelOptions) => {
      const qs = opts?.clientSlug ? `?client=${encodeURIComponent(opts.clientSlug)}` : "";
      router.push(`/ads/new${qs}`);
    },
    [router]
  );

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
