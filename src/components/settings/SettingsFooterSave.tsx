"use client";

import { DsButton, DsFormActions } from "@/design-system";

export function SettingsFooterSave({
  onSave,
  disabled,
  loading,
  loadingLabel,
  saveLabel,
  message
}: {
  onSave: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel: string;
  saveLabel: string;
  message?: string | null;
}) {
  return (
    <DsFormActions message={message} className="mt-6 border-t border-[var(--border-color)] pt-4">
      <DsButton variant="accent" size="md" disabled={disabled || loading} onClick={onSave}>
        {loading ? loadingLabel : saveLabel}
      </DsButton>
    </DsFormActions>
  );
}
