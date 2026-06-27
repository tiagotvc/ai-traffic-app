"use client";

import { useEffect, type RefObject } from "react";

export function useDismissOnOutsideClick(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  onDismiss: () => void,
  extraRef?: RefObject<HTMLElement | null>
) {
  useEffect(() => {
    if (!active) return;

    function onDoc(e: MouseEvent) {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if (extraRef?.current?.contains(target)) return;
      onDismiss();
    }

    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [active, onDismiss, ref, extraRef]);
}
