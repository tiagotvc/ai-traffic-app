"use client";

import { useEffect, type ReactNode } from "react";

import { UxModalPortal } from "@/uxpilot-ui/adapters/UxModalPortal";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  variant?: "default" | "danger";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = "default",
  loading = false,
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, onCancel]);

  return (
    <UxModalPortal open={open} onClose={loading ? undefined : onCancel}>
      <div
        className="ui-card w-full max-w-md overflow-hidden shadow-xl"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby={description ? "confirm-dialog-description" : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-[var(--border-color)] px-5 py-4">
          <h2
            id="confirm-dialog-title"
            className="font-heading text-base font-semibold text-[var(--text-main)]"
          >
            {title}
          </h2>
          {description ? (
            <p id="confirm-dialog-description" className="mt-2 text-sm text-[var(--text-dim)]">
              {description}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col-reverse gap-2 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="ui-btn-secondary w-full sm:w-auto"
            disabled={loading}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`w-full sm:w-auto ${variant === "danger" ? "ui-btn-danger" : "ui-btn-primary"}`}
            disabled={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </UxModalPortal>
  );
}
