"use client";

import { createContext, useContext } from "react";

export type AgencyBrainClientRow = { id: string; slug: string; name: string };

type AgencyBrainClientContextValue = {
  clientSlug: string;
  clients: AgencyBrainClientRow[];
  onClientChange: (slug: string) => void;
};

const AgencyBrainClientContext = createContext<AgencyBrainClientContextValue | null>(null);

export function AgencyBrainClientProvider({
  clientSlug,
  clients,
  onClientChange,
  children
}: {
  clientSlug: string;
  clients: AgencyBrainClientRow[];
  onClientChange: (slug: string) => void;
  children: React.ReactNode;
}) {
  return (
    <AgencyBrainClientContext.Provider value={{ clientSlug, clients, onClientChange }}>
      {children}
    </AgencyBrainClientContext.Provider>
  );
}

export function useAgencyBrainClient() {
  const ctx = useContext(AgencyBrainClientContext);
  if (!ctx) throw new Error("useAgencyBrainClient must be used within AgencyBrainClientProvider");
  return ctx;
}
