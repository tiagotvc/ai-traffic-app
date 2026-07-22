"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export type NavOption = { value: string; label: string };

/**
 * Switcher estilo breadcrumb do Google Ads: mostra o item atual como texto + seta e
 * abre um menu com os irmãos para trocar rápido. Identidade visual Orion (tokens de
 * superfície/acento). Usado no topo da tela de grupo (campanha › grupo).
 */
export function GoogleNavSelect({
  value,
  options,
  onSelect,
  ariaLabel
}: {
  value: string;
  options: NavOption[];
  onSelect: (value: string) => void;
  ariaLabel?: string;
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
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`inline-flex max-w-[16rem] items-center gap-1 rounded-lg border border-transparent px-2 py-1 text-lg font-semibold text-[var(--text-main)] transition hover:border-[var(--border-color)] hover:bg-[var(--surface-bg)] ${
          open ? "border-[var(--border-color)] bg-[var(--surface-bg)]" : ""
        }`}
      >
        <span className="truncate">{current?.label ?? "—"}</span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-[var(--text-dim)] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute left-0 z-30 mt-1 max-h-72 w-72 overflow-auto rounded-xl border border-[var(--border-color)] bg-[var(--surface-card)] p-1 shadow-lg"
        >
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
