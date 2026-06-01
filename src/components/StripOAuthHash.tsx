"use client";

import { useEffect } from "react";

/** Remove o fragmento #_=_ que o Facebook adiciona após OAuth. */
export function StripOAuthHash() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      sessionStorage.removeItem("traffic-auto-sync-done");
    } catch {
      /* ignore */
    }
    if (window.location.hash === "#_=_") {
      const url = window.location.pathname + window.location.search;
      window.history.replaceState(null, "", url);
    }
  }, []);
  return null;
}
