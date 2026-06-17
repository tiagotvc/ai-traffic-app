"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

import { useRouter } from "@/i18n/navigation";

export type PublishPanelOptions = {
  clientSlug?: string;
  metaCampaignId?: string;
  adsetId?: string;
  mode?: "add-ad" | "full";
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

  const openPanel = useCallback(
    (opts?: PublishPanelOptions) => {
      const params = new URLSearchParams();
      if (opts?.clientSlug) params.set("client", opts.clientSlug);
      if (opts?.metaCampaignId) params.set("fromCampaign", opts.metaCampaignId);
      if (opts?.adsetId) params.set("adset", opts.adsetId);
      if (opts?.mode === "add-ad") params.set("mode", "add-ad");
      const qs = params.toString() ? `?${params.toString()}` : "";
      router.push(`/campaigns/new${qs}`);
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
