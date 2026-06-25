"use client";

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
  countLabel
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

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-[var(--text-dim)]">
        {label} {countLabel(rows.length, maxItems)}
      </p>
      <div className="space-y-2">
        {rows.map((value, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type="text"
              value={value}
              onChange={(e) => updateRow(index, e.target.value)}
              placeholder={placeholder}
              disabled={disabled}
              className="ui-input flex-1 text-sm"
            />
            {rows.length > 1 ? (
              <button
                type="button"
                onClick={() => removeRow(index)}
                disabled={disabled}
                className="shrink-0 rounded-lg px-2 py-1.5 text-sm text-[var(--text-dimmer)] hover:bg-[var(--surface-bg)] hover:text-[var(--text-dim)] disabled:opacity-50"
                aria-label={removeLabel}
              >
                ×
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
        className="ui-btn-secondary text-xs disabled:opacity-50"
        title={atMax ? undefined : addLabel}
      >
        {addLabel}
      </button>
    </div>
  );
}
