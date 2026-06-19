"use client";

import { useEffect, useRef, useState } from "react";

export type TargetingItem = {
  value: string;
  label: string;
  sub?: string;
  meta?: { type?: string; countryCode?: string; kind?: string; bucket?: string };
};

type SearchType = "interest" | "geo" | "locale" | "behavior" | "demographic";

function mapResults(type: SearchType, results: unknown[]): TargetingItem[] {
  if (type === "interest") {
    return (results as Array<{ id: string; name: string; audienceSize?: number }>).map((r) => ({
      value: r.id,
      label: r.name,
      sub: r.audienceSize ? `~${Intl.NumberFormat().format(r.audienceSize)}` : undefined,
      meta: { kind: "interest" }
    }));
  }
  if (type === "behavior" || type === "demographic") {
    return (results as Array<{ id: string; name: string; audience_size?: number }>).map((r) => ({
      value: r.id,
      label: r.name,
      sub: r.audience_size ? `~${Intl.NumberFormat().format(r.audience_size)}` : undefined,
      meta: { kind: type === "behavior" ? "behavior" : "demographic" }
    }));
  }
  if (type === "geo") {
    return (
      results as Array<{ key: string; name: string; type: string; countryCode?: string }>
    ).map((r) => ({
      value: r.key,
      label: r.name,
      sub: [r.type, r.countryCode].filter(Boolean).join(" · "),
      meta: { type: r.type, countryCode: r.countryCode }
    }));
  }
  return (results as Array<{ key: number; name: string }>).map((r) => ({
    value: String(r.key),
    label: r.name,
    meta: { kind: "locale" }
  }));
}

export function MetaTargetingSelect({
  type,
  placeholder,
  selected,
  onAdd,
  onRemove,
  disabled
}: {
  type: SearchType;
  placeholder?: string;
  selected: TargetingItem[];
  onAdd: (item: TargetingItem) => void;
  onRemove: (value: string) => void;
  disabled?: boolean;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<TargetingItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      fetch(`/api/meta/targeting-search?type=${type}&q=${encodeURIComponent(q.trim())}`, {
        signal: ctrl.signal
      })
        .then((r) => r.json())
        .then((j) => {
          if (j.ok) {
            setResults(mapResults(type, j.results ?? []));
            setOpen(true);
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 350);
    return () => {
      ctrl.abort();
      window.clearTimeout(timer);
    };
  }, [q, type]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const selectedValues = new Set(selected.map((s) => s.value));

  return (
    <div ref={boxRef} className="relative">
      <div className="flex flex-wrap gap-1.5">
        {selected.map((s) => (
          <span
            key={s.value}
            className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-800"
          >
            {s.label}
            <button
              type="button"
              onClick={() => onRemove(s.value)}
              className="text-violet-500 hover:text-violet-900"
              aria-label="Remover"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        value={q}
        disabled={disabled}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        placeholder={placeholder}
        className="ui-input mt-1 w-full disabled:opacity-60"
      />
      {open && (loading || results.length > 0) ? (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {loading ? (
            <div className="px-3 py-2 text-xs text-slate-400">…</div>
          ) : (
            results.map((r) => {
              const already = selectedValues.has(r.value);
              return (
                <button
                  key={r.value}
                  type="button"
                  disabled={already}
                  onClick={() => {
                    onAdd(r);
                    setQ("");
                    setResults([]);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-violet-50 disabled:opacity-40"
                >
                  <span className="text-slate-800">{r.label}</span>
                  {r.sub ? <span className="text-slate-400">{r.sub}</span> : null}
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
