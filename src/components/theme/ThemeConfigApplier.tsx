"use client";

import { useEffect } from "react";

import {
  applyThemeConfigToDocument,
  mergeThemeConfig,
  THEME_UPDATED_EVENT,
  type DesignSystemThemeConfig
} from "@/lib/design-system/theme-config";

async function loadAndApply() {
  try {
    const res = await fetch("/api/platform/theme");
    const json = await res.json();
    if (json.ok && json.config) {
      applyThemeConfigToDocument(mergeThemeConfig(json.config));
    }
  } catch {
    /* ignore — fall back to globals.css defaults */
  }
}

export function ThemeConfigApplier() {
  useEffect(() => {
    void loadAndApply();

    function onUpdated(e: Event) {
      const detail = (e as CustomEvent<DesignSystemThemeConfig>).detail;
      if (detail) {
        applyThemeConfigToDocument(mergeThemeConfig(detail));
        return;
      }
      void loadAndApply();
    }

    window.addEventListener(THEME_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(THEME_UPDATED_EVENT, onUpdated);
  }, []);

  return null;
}
