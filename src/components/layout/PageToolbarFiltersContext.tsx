"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";

type PageToolbarFiltersContextValue = {
  filtersOpen: boolean;
  setFiltersOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  openFilters: () => void;
};

const PageToolbarFiltersContext = createContext<PageToolbarFiltersContextValue | null>(null);

export function usePageToolbarFiltersOptional() {
  return useContext(PageToolbarFiltersContext);
}

export function PageToolbarFiltersProvider({
  children,
  filtersOpen,
  setFiltersOpen
}: {
  children: ReactNode;
  filtersOpen: boolean;
  setFiltersOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
}) {
  const openFilters = useCallback(() => setFiltersOpen(true), [setFiltersOpen]);
  const value = useMemo(
    () => ({ filtersOpen, setFiltersOpen, openFilters }),
    [filtersOpen, setFiltersOpen, openFilters]
  );

  return (
    <PageToolbarFiltersContext.Provider value={value}>{children}</PageToolbarFiltersContext.Provider>
  );
}
