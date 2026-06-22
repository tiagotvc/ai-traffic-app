"use client";

import { useEffect, useRef } from "react";

import {
  useCommandStripOptional,
  type CommandStripPageConfig
} from "@/components/layout/CommandStripContext";

const EMPTY: CommandStripPageConfig = {};

function mergePageConfig(
  prev: CommandStripPageConfig,
  next: CommandStripPageConfig
): CommandStripPageConfig {
  return {
    hideFilters: next.hideFilters ?? prev.hideFilters,
    hideSync: next.hideSync ?? prev.hideSync,
    periodFilterDisabled: next.periodFilterDisabled ?? prev.periodFilterDisabled,
    periodFilterDisabledHint: next.periodFilterDisabledHint ?? prev.periodFilterDisabledHint,
    searchPlaceholder: next.searchPlaceholder ?? prev.searchPlaceholder,
    searchValue: next.searchValue ?? prev.searchValue,
    onSearchChange: next.onSearchChange ?? prev.onSearchChange,
    leadingSlot: next.leadingSlot !== undefined ? next.leadingSlot : prev.leadingSlot,
    middleTrailingSlot:
      next.middleTrailingSlot !== undefined ? next.middleTrailingSlot : prev.middleTrailingSlot,
    trailingSlot: next.trailingSlot !== undefined ? next.trailingSlot : prev.trailingSlot
  };
}

function pageConfigEqual(a: CommandStripPageConfig, b: CommandStripPageConfig): boolean {
  return (
    a.hideFilters === b.hideFilters &&
    a.hideSync === b.hideSync &&
    a.periodFilterDisabled === b.periodFilterDisabled &&
    a.periodFilterDisabledHint === b.periodFilterDisabledHint &&
    a.searchPlaceholder === b.searchPlaceholder &&
    a.searchValue === b.searchValue &&
    a.onSearchChange === b.onSearchChange &&
    a.leadingSlot === b.leadingSlot &&
    a.middleTrailingSlot === b.middleTrailingSlot &&
    a.trailingSlot === b.trailingSlot
  );
}

/**
 * Per-route CommandStrip overrides (search slot, hide sync, trailing actions, etc.).
 */
export function useCommandStripPage(config: CommandStripPageConfig) {
  const ctx = useCommandStripOptional();
  const setPageConfig = ctx?.setPageConfig;
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    if (!setPageConfig) return;
    setPageConfig((prev) => {
      const merged = mergePageConfig(prev, configRef.current);
      if (pageConfigEqual(prev, merged)) return prev;
      return merged;
    });
  }, [
    setPageConfig,
    config.hideFilters,
    config.hideSync,
    config.periodFilterDisabled,
    config.periodFilterDisabledHint,
    config.searchPlaceholder,
    config.searchValue,
    config.onSearchChange,
    config.leadingSlot,
    config.middleTrailingSlot,
    config.trailingSlot
  ]);

  useEffect(() => {
    if (!setPageConfig) return;
    return () => setPageConfig(EMPTY);
  }, [setPageConfig]);
}

export type { CommandStripPageConfig };
