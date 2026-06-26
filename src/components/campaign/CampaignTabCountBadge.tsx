"use client";

/** Badge compacto ao lado do status da campanha. */
export function CampaignTabCountBadge({
  count,
  label
}: {
  count: number | string;
  label?: string;
}) {
  return (
    <span
      className="inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[11px] font-semibold tabular-nums"
      style={{
        background: "var(--surface-thead)",
        color: "var(--text-dim)",
        borderColor: "var(--border-color)"
      }}
    >
      <span className="font-bold text-[var(--ui-accent)]">{count}</span>
      {label ? <span className="text-[var(--text-dimmer)]">{label}</span> : null}
    </span>
  );
}
