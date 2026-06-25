"use client";

import { createContext, useContext } from "react";

export type ClientViewContextValue = {
  viewToken: string;
  readOnly: boolean;
};

const ClientViewContext = createContext<ClientViewContextValue | null>(null);

export function ClientViewProvider({
  viewToken,
  readOnly = true,
  children
}: {
  viewToken: string;
  readOnly?: boolean;
  children: React.ReactNode;
}) {
  return (
    <ClientViewContext.Provider value={{ viewToken, readOnly }}>
      {children}
    </ClientViewContext.Provider>
  );
}

export function useClientViewOptional(): ClientViewContextValue | null {
  return useContext(ClientViewContext);
}

export function appendViewToken(params: URLSearchParams, viewToken: string | null | undefined) {
  if (viewToken) params.set("viewToken", viewToken);
}
