"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

import { useCommandStripOptional } from "@/components/layout/CommandStripContext";

type StripBridge = {
  isEmptyState: boolean;
  setIsEmptyState: (value: boolean) => void;
};

const StripBridgeContext = createContext<StripBridge | null>(null);

export function CommandStripBridgeProvider({ children }: { children: ReactNode }) {
  const strip = useCommandStripOptional();
  const [localEmpty, setLocalEmpty] = useState(false);

  const value: StripBridge = strip
    ? { isEmptyState: strip.isEmptyState, setIsEmptyState: strip.setIsEmptyState }
    : { isEmptyState: localEmpty, setIsEmptyState: setLocalEmpty };

  return <StripBridgeContext.Provider value={value}>{children}</StripBridgeContext.Provider>;
}

/** Used by synced UX Pilot content pages (DashboardContent, etc.). */
export function useUxCommandStrip(): StripBridge {
  const ctx = useContext(StripBridgeContext);
  const [localEmpty, setLocalEmpty] = useState(false);
  if (ctx) return ctx;
  return { isEmptyState: localEmpty, setIsEmptyState: setLocalEmpty };
}
