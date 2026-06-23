"use client";

/** Toggle estilo Meta: ativo = verde à direita; pausado = trilho visível à esquerda. */
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
      className="relative inline-flex h-[22px] w-[40px] shrink-0 items-center rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--violet)] focus-visible:ring-offset-1 disabled:cursor-wait disabled:opacity-60"
      style={{
        background: active ? "var(--toggle-track-on)" : "var(--toggle-track-off)",
        borderColor: "var(--toggle-border)"
      }}
    >
      <span
        className="pointer-events-none absolute top-[2px] h-4 w-4 rounded-full transition-transform duration-200"
        style={{
          background: "var(--toggle-knob)",
          boxShadow: "var(--toggle-knob-shadow)",
          transform: active ? "translateX(18px)" : "translateX(2px)"
        }}
      />
    </button>
  );
}
