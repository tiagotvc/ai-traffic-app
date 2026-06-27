"use client";

import { X } from "lucide-react";

import { cn } from "@/lib/cn";

type Props = {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  maxItems?: number;
  placeholder?: string;
  disabled?: boolean;
  addLabel: string;
  removeLabel: string;
  countLabel: (count: number, max: number) => string;
  multiline?: boolean;
};

export function MetaTextVariantsInput({
  label,
  values,
  onChange,
  maxItems = 5,
  placeholder,
  disabled,
  addLabel,
  removeLabel,
  countLabel,
  multiline = false
}: Props) {
  const rows = values.length ? values : [""];
  const atMax = rows.length >= maxItems;

  function updateRow(index: number, text: string) {
    const next = [...rows];
    next[index] = text;
    onChange(next);
  }

  function removeRow(index: number) {
    if (rows.length <= 1) return;
    onChange(rows.filter((_, i) => i !== index));
  }

  function addRow() {
    if (atMax) return;
    onChange([...rows, ""]);
  }

  const fieldClass =
    "min-w-0 flex-1 border-0 bg-transparent text-sm text-[var(--text-main)] outline-none placeholder:text-[var(--text-dimmer)]";

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <h5 className="campaign-creator-section-title text-sm">{label}</h5>
        <span className="shrink-0 text-xs font-medium text-[var(--text-dim)]">
          {countLabel(rows.length, maxItems)}
        </span>
      </div>
      <div className="space-y-2">
        {rows.map((value, index) => (
          <div key={index} className="flex items-start gap-2">
            <div className="campaign-creator-budget-daily-input min-w-0 flex-1 !max-w-none">
              {multiline ? (
                <textarea
                  value={value}
                  onChange={(e) => updateRow(index, e.target.value)}
                  placeholder={placeholder}
                  disabled={disabled}
                  rows={2}
                  className={cn(fieldClass, "resize-y py-0.5")}
                />
              ) : (
                <input
                  type="text"
                  value={value}
                  onChange={(e) => updateRow(index, e.target.value)}
                  placeholder={placeholder}
                  disabled={disabled}
                  className={cn(fieldClass, "campaign-creator-budget-daily-input__field")}
                />
              )}
            </div>
            {rows.length > 1 ? (
              <button
                type="button"
                onClick={() => removeRow(index)}
                disabled={disabled}
                className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--creator-card-border,var(--border-color))] text-[var(--text-dimmer)] transition hover:bg-[var(--creator-card-bg-inset,var(--surface-bg))] hover:text-[var(--text-dim)] disabled:opacity-50"
                aria-label={removeLabel}
              >
                <X size={14} strokeWidth={2} />
              </button>
            ) : (
              <span className="w-8 shrink-0" aria-hidden />
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addRow}
        disabled={disabled || atMax}
        className="ui-btn-secondary inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
        title={atMax ? undefined : addLabel}
      >
        {addLabel}
      </button>
    </div>
  );
}
