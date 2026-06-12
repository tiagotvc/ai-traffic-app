"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { Link, useRouter } from "@/i18n/navigation";

// Tela "Escolha suas contas de anúncio" (onboarding).
// Lista as contas da Meta disponíveis; "Continuar" importa as NOVAS selecionadas
// (cria 1 cliente por conta e vincula). Aditivo — não remove as desmarcadas.

function Icon({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

const ICONS = {
  check: "M4.5 12.75l6 6 9-13.5",
  search: "M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
};

type Account = {
  metaAdAccountId: string;
  label: string;
  metaBusinessId: string | null;
  metaBusinessName: string | null;
  spendLast30d: number | null;
};

// Mock para visualizar a tela sem Meta conectada (ative com NEXT_PUBLIC_MOCK_ACCOUNTS=1 no .env local).
const USE_MOCK = process.env.NEXT_PUBLIC_MOCK_ACCOUNTS === "1";
const MOCK_ACCOUNTS: Account[] = [
  { metaAdAccountId: "act_1001", label: "Gabriela Dawson — Pacientes", metaBusinessId: "bm1", metaBusinessName: "Dawson Estética", spendLast30d: 4280 },
  { metaAdAccountId: "act_1002", label: "Gabriela Dawson — Alunos", metaBusinessId: "bm1", metaBusinessName: "Dawson Estética", spendLast30d: 1530 },
  { metaAdAccountId: "act_1003", label: "Imper Estofados", metaBusinessId: "bm2", metaBusinessName: "Imper", spendLast30d: 9120 },
  { metaAdAccountId: "act_1004", label: "Loja Couro Rio", metaBusinessId: "bm2", metaBusinessName: "Imper", spendLast30d: 340 },
  { metaAdAccountId: "act_1005", label: "Conta de teste", metaBusinessId: null, metaBusinessName: null, spendLast30d: null }
];
const MOCK_LINKED = new Set(["act_1001"]);

export function ChooseAdAccountsView() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [linkedSet, setLinkedSet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (USE_MOCK) {
      setAccounts(MOCK_ACCOUNTS);
      setLinkedSet(MOCK_LINKED);
      setSelected(new Set(MOCK_LINKED));
      setLoading(false);
      return;
    }
    Promise.all([
      fetch("/api/meta/account-options").then((r) => r.json()),
      fetch("/api/meta/ad-accounts").then((r) => r.json())
    ])
      .then(([opts, linked]) => {
        const list = (opts.accounts ?? []) as Account[];
        const linkedIds = new Set<string>(
          ((linked.accounts ?? []) as Array<{ metaAdAccountId: string }>).map(
            (a) => a.metaAdAccountId
          )
        );
        setAccounts(list);
        setLinkedSet(linkedIds);
        setSelected(new Set(linkedIds)); // já vinculadas vêm marcadas
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return accounts;
    return accounts.filter(
      (a) =>
        a.label.toLowerCase().includes(needle) ||
        a.metaAdAccountId.toLowerCase().includes(needle) ||
        (a.metaBusinessName ?? "").toLowerCase().includes(needle)
    );
  }, [accounts, q]);

  const allSelected = filtered.length > 0 && filtered.every((a) => selected.has(a.metaAdAccountId));
  const toImport = useMemo(
    () => [...selected].filter((id) => !linkedSet.has(id)),
    [selected, linkedSet]
  );

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

  function continuar() {
    if (USE_MOCK) {
      // No mock não há contas reais para importar — só simula seguir.
      router.push("/dashboard");
      return;
    }
    if (!toImport.length) {
      router.push("/dashboard");
      return;
    }
    startTransition(async () => {
      setError(null);
      const res = await fetch("/api/meta/import-accounts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ metaAdAccountIds: toImport })
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) {
        setError("Não foi possível importar as contas. Tente novamente.");
        return;
      }
      router.push("/dashboard");
    });
  }

  function avatarLetter(label: string) {
    const m = label.match(/[a-z0-9]/i);
    return (m?.[0] ?? "C").toUpperCase();
  }
  function fmtSpend(v: number | null) {
    if (v == null) return null;
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
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
          Selecione as contas que você quer trazer para o painel. Cada conta nova vira um
          cliente. As já vinculadas vêm marcadas — desmarcar não remove nada.
        </p>
      </div>

      <div className="ui-card overflow-hidden">
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
          <span className="text-xs text-slate-400">{selected.size} selecionadas</span>
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

        <div className="max-h-[52vh] divide-y divide-slate-100 overflow-y-auto">
          {loading ? (
            <p className="p-8 text-center text-sm text-slate-500">Carregando contas…</p>
          ) : filtered.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">Nenhuma conta encontrada.</p>
          ) : (
            filtered.map((a) => {
              const isSel = selected.has(a.metaAdAccountId);
              const isLinked = linkedSet.has(a.metaAdAccountId);
              const spend = fmtSpend(a.spendLast30d);
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
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-slate-800">{a.label}</span>
                      {isLinked ? (
                        <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">
                          Vinculada
                        </span>
                      ) : null}
                    </span>
                    <span className="block truncate text-[11px] text-slate-400">
                      {a.metaBusinessName ? `${a.metaBusinessName} · ` : ""}
                      {a.metaAdAccountId}
                    </span>
                  </span>
                  {spend ? (
                    <span className="shrink-0 text-right text-[11px] text-slate-400">
                      <span className="block font-medium text-slate-600">{spend}</span>
                      30 dias
                    </span>
                  ) : null}
                </label>
              );
            })
          )}
        </div>
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <div className="flex items-center justify-between gap-3">
        <Link href="/dashboard" className="text-sm font-medium text-slate-500 hover:text-slate-700">
          Pular por enquanto
        </Link>
        <button
          type="button"
          onClick={continuar}
          disabled={isPending}
          className="ui-btn-primary disabled:opacity-60"
        >
          {isPending
            ? "Importando…"
            : toImport.length
              ? `Importar ${toImport.length} ${toImport.length === 1 ? "conta" : "contas"}`
              : "Continuar"}
        </button>
      </div>
    </div>
  );
}
