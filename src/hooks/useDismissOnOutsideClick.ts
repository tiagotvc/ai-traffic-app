"use client";

import { useEffect, type RefObject } from "react";

export function useDismissOnOutsideClick(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  onDismiss: () => void
) {
  useEffect(() => {
    if (!active) return;

    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) onDismiss();
    }

    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [active, onDismiss, ref]);
}
