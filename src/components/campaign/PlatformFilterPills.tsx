"use client";

export type PlatformValue = "meta" | "google" | "both";

function MetaGlyph() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#0866FF"
        d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"
      />
    </svg>
  );
}

function GoogleGlyph() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.6h5.1c-.2 1.2-1.5 3.6-5.1 3.6-3.1 0-5.6-2.6-5.6-5.8S8.9 5.8 12 5.8c1.8 0 3 .8 3.7 1.4l2.5-2.4C16.5 3.4 14.5 2.6 12 2.6 6.9 2.6 2.7 6.8 2.7 12s4.2 9.4 9.3 9.4c5.4 0 8.9-3.8 8.9-9.1 0-.6-.1-1.1-.2-1.5H12z"
      />
    </svg>
  );
}

/**
 * Filtro de plataforma em pills segmentadas (Meta / Google / Ambos).
 * Estilo aprovado: borda espessa + cor no ativo (sem preenchimento), hover e feedback de clique.
 * Labels via prop para ser namespace-agnóstico (dashboard, campanhas, cliente…).
 */
export function PlatformFilterPills({
  value,
  onChange,
  labels,
  className
}: {
  value: PlatformValue;
  onChange: (v: PlatformValue) => void;
  labels: Record<PlatformValue, string>;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className ?? ""}`}>
      {(["meta", "google", "both"] as const).map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-xs font-medium transition active:scale-95 hover:bg-[var(--surface-bg)] ${
            value === p
              ? "border-[var(--ui-accent)] font-semibold text-[var(--ui-accent)]"
              : "border-[var(--border-color)] text-[var(--text-dim)] hover:border-[var(--ui-accent)] hover:text-[var(--text-main)]"
          }`}
        >
          {p !== "google" ? <MetaGlyph /> : null}
          {p !== "meta" ? <GoogleGlyph /> : null}
          {labels[p]}
        </button>
      ))}
    </div>
  );
}
