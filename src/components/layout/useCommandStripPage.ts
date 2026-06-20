"use client";

import { useEffect, useRef } from "react";

import {
  useCommandStripOptional,
  type CommandStripPageConfig
} from "@/components/layout/CommandStripContext";

const EMPTY: CommandStripPageConfig = {};

/** Compare fields that are safe to use as effect dependencies (not ReactNode slots). */
function stableFieldsEqual(a: CommandStripPageConfig, b: CommandStripPageConfig) {
  return (
    a.hideFilters === b.hideFilters &&
    a.hideSync === b.hideSync &&
    a.searchPlaceholder === b.searchPlaceholder &&
    a.searchValue === b.searchValue &&
    a.onSearchChange === b.onSearchChange
  );
}

/**
 * Per-route CommandStrip overrides (search slot, hide sync, etc.).
 * ReactNode slots (trailingSlot, etc.) are read from a ref so inline JSX does not retrigger updates every render.
 */
export function useCommandStripPage(config: CommandStripPageConfig) {
  const ctx = useCommandStripOptional();
  const setPageConfig = ctx?.setPageConfig;
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    if (!setPageConfig) return;
    setPageConfig((prev) => {
      const next = configRef.current;
      if (stableFieldsEqual(prev, next)) return prev;
      return next;
    });
  }, [
    setPageConfig,
    config.hideFilters,
    config.hideSync,
    config.searchPlaceholder,
    config.searchValue,
    config.onSearchChange
  ]);

  useEffect(() => {
    if (!setPageConfig) return;
    return () => setPageConfig(EMPTY);
  }, [setPageConfig]);
}

export type { CommandStripPageConfig };
