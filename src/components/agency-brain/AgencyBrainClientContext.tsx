"use client";

import { createContext, useContext } from "react";

const AgencyBrainClientContext = createContext<{ clientSlug: string } | null>(null);

export function AgencyBrainClientProvider({
  clientSlug,
  children
}: {
  clientSlug: string;
  children: React.ReactNode;
}) {
  return (
    <AgencyBrainClientContext.Provider value={{ clientSlug }}>
      {children}
    </AgencyBrainClientContext.Provider>
  );
}

export function useAgencyBrainClient() {
  const ctx = useContext(AgencyBrainClientContext);
  if (!ctx) throw new Error("useAgencyBrainClient must be used within AgencyBrainClientProvider");
  return ctx;
}
