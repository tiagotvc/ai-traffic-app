"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export type NavOption = { value: string; label: string };

/**
 * Seletor de navegação no padrão do Google Ads: uma "caixa" com rótulo do nível em
 * cima (ex.: Campanha), ícone + valor atual e seta; clicar abre o menu de irmãos.
 * Identidade visual Orion (tokens de superfície/acento). A caixa ativa (nível atual
 * da página) ganha um sublinhado de destaque.
 */
export function GoogleNavSelect({
  label,
  value,
  options,
  onSelect,
  icon,
  active = false
}: {
  label: string;
  value: string;
  options: NavOption[];
  onSelect: (value: string) => void;
  icon?: ReactNode;
  active?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex min-w-[11rem] max-w-[18rem] flex-col gap-0.5 rounded-lg border border-[var(--border-color)] bg-[var(--surface-card)] px-3 py-1.5 text-left transition hover:border-[var(--ui-accent)] ${
          active ? "shadow-[inset_0_-2px_0_0_var(--ui-accent)]" : ""
        }`}
      >
        <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--text-dimmer)]">
          {label}
        </span>
        <span className="flex items-center gap-1.5">
          {icon ? <span className="shrink-0 text-[var(--text-dim)]">{icon}</span> : null}
          <span className="flex-1 truncate text-sm font-semibold text-[var(--text-main)]">
            {current?.label ?? "—"}
          </span>
          <ChevronDown
            size={15}
            className={`shrink-0 text-[var(--text-dim)] transition-transform ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute left-0 z-30 mt-1 max-h-72 w-72 overflow-auto rounded-xl border border-[var(--border-color)] bg-[var(--surface-card)] p-1 shadow-lg"
        >
          {options.length === 0 ? (
            <div className="px-3 py-1.5 text-xs text-[var(--text-dimmer)]">—</div>
          ) : null}
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              onClick={() => {
                setOpen(false);
                if (o.value !== value) onSelect(o.value);
              }}
              className={`block w-full truncate rounded-lg px-3 py-1.5 text-left text-sm transition hover:bg-[var(--surface-bg)] ${
                o.value === value
                  ? "font-semibold text-[var(--ui-accent)]"
                  : "text-[var(--text-dim)] hover:text-[var(--text-main)]"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
