"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

export type UxFloatingActionAnchor = {
  left: number;
  width: number;
};

/** Barra de ações flutuante, reutilizável em qualquer tela (portal + overlay). */
export function UxFloatingActionBar({
  open,
  onClose,
  anchor,
  children
}: {
  open: boolean;
  onClose?: () => void;
  anchor?: UxFloatingActionAnchor | null;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const positioned = anchor && anchor.width > 0;

  return createPortal(
    <div className="fixed inset-0 z-[200] pointer-events-none">
      <button
        type="button"
        aria-label="Fechar menu de ações"
        className="pointer-events-auto absolute inset-0 bg-black/20"
        onClick={onClose}
      />
      <div
        className="pointer-events-auto absolute bottom-8 rounded-xl border shadow-[0_16px_48px_rgba(0,0,0,0.45)]"
        style={{
          left: positioned ? anchor.left : "50%",
          width: positioned ? anchor.width : "min(calc(100vw - 2rem), 56rem)",
          transform: positioned ? "none" : "translateX(-50%)",
          background: "var(--surface-card)",
          borderColor: "var(--border-hover, rgba(255,255,255,0.12))"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3">{children}</div>
      </div>
    </div>,
    document.body
  );
}
