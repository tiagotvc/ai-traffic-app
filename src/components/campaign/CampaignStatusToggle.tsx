"use client";

/** Toggle estilo Meta: ativo = verde à direita; pausado = cinza à esquerda. */
export function CampaignStatusToggle({
  active,
  disabled,
  onChange,
  ariaLabel
}: {
  active: boolean;
  disabled?: boolean;
  onChange: () => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-1 disabled:cursor-wait disabled:opacity-60 ${
        active ? "bg-emerald-500" : "bg-slate-300/80"
      }`}
    >
      <span
        className={`pointer-events-none absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
          active ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}
