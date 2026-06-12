"use client";

import { useEffect, useMemo, useState } from "react";

import { Link } from "@/i18n/navigation";

// Tela "Escolha suas contas de anúncio" (onboarding) — VISUAL (seleção local;
// a aplicação da escolha fica para depois).

function Icon({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

const ICONS = {
  card: "M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z",
  check: "M4.5 12.75l6 6 9-13.5",
  search:
    "M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
};

type Account = { metaAdAccountId: string; label: string; metaBusinessId: string | null };

export function ChooseAdAccountsView() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch("/api/meta/ad-accounts")
      .then((r) => r.json())
      .then((j) => {
        const list = (j.accounts ?? []) as Account[];
        setAccounts(list);
        setSelected(new Set(list.map((a) => a.metaAdAccountId)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return accounts;
    return accounts.filter(
      (a) => a.label.toLowerCase().includes(needle) || a.metaAdAccountId.toLowerCase().includes(needle)
    );
  }, [accounts, q]);

  const allSelected = filtered.length > 0 && filtered.every((a) => selected.has(a.metaAdAccountId));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) filtered.forEach((a) => next.delete(a.metaAdAccountId));
      else filtered.forEach((a) => next.add(a.metaAdAccountId));
      return next;
    });
  }

  function avatarLetter(label: string) {
    const m = label.match(/[a-z0-9]/i);
    return (m?.[0] ?? "C").toUpperCase();
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      {/* Passos */}
      <div className="flex items-center gap-2 text-xs font-medium">
        <span className="flex items-center gap-1.5 text-violet-600">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-100 text-[11px]">
            <Icon d={ICONS.check} className="h-3 w-3" />
          </span>
          Conectar
        </span>
        <span className="h-px w-6 bg-slate-200" />
        <span className="flex items-center gap-1.5 text-slate-900">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-[11px] font-bold text-white">
            2
          </span>
          Escolher contas
        </span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Escolha suas contas de anúncio</h1>
        <p className="mt-1 text-sm text-slate-500">
          Selecione quais contas você quer acompanhar no painel. Você pode mudar isso depois.
        </p>
      </div>

      <div className="ui-card overflow-hidden">
        {/* Barra: selecionar todas + busca */}
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="h-4 w-4 accent-violet-600"
            />
            Selecionar todas
          </label>
          <span className="text-xs text-slate-400">
            {selected.size} de {accounts.length} selecionadas
          </span>
          <div className="relative ml-auto">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
              <Icon d={ICONS.search} className="h-4 w-4" />
            </span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar conta…"
              className="ui-input !w-56 !py-1.5 pl-8 text-sm"
            />
          </div>
        </div>

        {/* Lista */}
        <div className="max-h-[52vh] divide-y divide-slate-100 overflow-y-auto">
          {loading ? (
            <p className="p-8 text-center text-sm text-slate-500">Carregando contas…</p>
          ) : filtered.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">Nenhuma conta encontrada.</p>
          ) : (
            filtered.map((a) => {
              const isSel = selected.has(a.metaAdAccountId);
              return (
                <label
                  key={a.metaAdAccountId}
                  className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition hover:bg-slate-50 ${
                    isSel ? "bg-violet-50/40" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSel}
                    onChange={() => toggle(a.metaAdAccountId)}
                    className="h-4 w-4 accent-violet-600"
                  />
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-semibold ${
                      isSel ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {avatarLetter(a.label)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-800">
                      {a.label}
                    </span>
                    <span className="block truncate text-[11px] text-slate-400">
                      {a.metaAdAccountId}
                    </span>
                  </span>
                  {isSel ? (
                    <span className="text-violet-600">
                      <Icon d={ICONS.check} className="h-4 w-4" />
                    </span>
                  ) : null}
                </label>
              );
            })
          )}
        </div>
      </div>

      {/* Rodapé */}
      <div className="flex items-center justify-between gap-3">
        <Link href="/dashboard" className="text-sm font-medium text-slate-500 hover:text-slate-700">
          Pular por enquanto
        </Link>
        <button
          type="button"
          disabled={selected.size === 0}
          className="ui-btn-primary disabled:opacity-50"
        >
          Continuar com {selected.size} {selected.size === 1 ? "conta" : "contas"}
        </button>
      </div>
    </div>
  );
}
