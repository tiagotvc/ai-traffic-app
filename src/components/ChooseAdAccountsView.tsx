"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { Link, useRouter } from "@/i18n/navigation";

// Onboarding: 1º escolhe o Business Manager, 2º escolhe as contas DAQUELA BM.
// "Continuar" importa as NOVAS selecionadas (cria 1 cliente por conta). Aditivo.

function Icon({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

const ICONS = {
  check: "M4.5 12.75l6 6 9-13.5",
  search: "M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z",
  building:
    "M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21",
  chevron: "M8.25 4.5l7.5 7.5-7.5 7.5"
};

type Business = { metaBusinessId: string; name: string; adAccountCount: number };
type Account = {
  metaAdAccountId: string;
  label: string;
  metaBusinessId: string | null;
  metaBusinessName: string | null;
  spendLast30d: number | null;
};

// Mock (ative com NEXT_PUBLIC_MOCK_ACCOUNTS=1 no .env local).
const USE_MOCK = process.env.NEXT_PUBLIC_MOCK_ACCOUNTS === "1";
const MOCK_BUSINESSES: Business[] = [
  { metaBusinessId: "bm1", name: "Dawson Estética", adAccountCount: 2 },
  { metaBusinessId: "bm2", name: "Imper", adAccountCount: 2 }
];
const MOCK_ACCOUNTS: Account[] = [
  { metaAdAccountId: "act_1001", label: "Gabriela Dawson — Pacientes", metaBusinessId: "bm1", metaBusinessName: "Dawson Estética", spendLast30d: 4280 },
  { metaAdAccountId: "act_1002", label: "Gabriela Dawson — Alunos", metaBusinessId: "bm1", metaBusinessName: "Dawson Estética", spendLast30d: 1530 },
  { metaAdAccountId: "act_1003", label: "Imper Estofados", metaBusinessId: "bm2", metaBusinessName: "Imper", spendLast30d: 9120 },
  { metaAdAccountId: "act_1004", label: "Loja Couro Rio", metaBusinessId: "bm2", metaBusinessName: "Imper", spendLast30d: 340 }
];
const MOCK_LINKED = new Set(["act_1001"]);

function Steps({ step }: { step: "bm" | "accounts" }) {
  return (
    <div className="flex items-center gap-2 text-xs font-medium">
      <span className="flex items-center gap-1.5 text-[var(--violet)]">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[rgba(124,58,237,0.1)]">
          <Icon d={ICONS.check} className="h-3 w-3" />
        </span>
        Conectar
      </span>
      <span className="h-px w-5 bg-slate-200" />
      <span className={`flex items-center gap-1.5 ${step === "accounts" ? "text-[var(--violet)]" : "text-[var(--text-main)]"}`}>
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
            step === "accounts" ? "bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]" : "bg-[var(--ui-accent)] text-[var(--ui-accent-btn-text)]"
          }`}
        >
          {step === "accounts" ? <Icon d={ICONS.check} className="h-3 w-3" /> : "2"}
        </span>
        Business
      </span>
      <span className="h-px w-5 bg-slate-200" />
      <span className={`flex items-center gap-1.5 ${step === "accounts" ? "text-[var(--text-main)]" : "text-[var(--text-dimmer)]"}`}>
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
            step === "accounts" ? "bg-[var(--ui-accent)] text-[var(--ui-accent-btn-text)]" : "bg-slate-200 text-[var(--text-dim)]"
          }`}
        >
          3
        </span>
        Contas
      </span>
    </div>
  );
}

export function ChooseAdAccountsView() {
  const router = useRouter();
  const [step, setStep] = useState<"bm" | "accounts">("bm");

  // BMs
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [bmLoading, setBmLoading] = useState(true);
  const [bm, setBm] = useState<Business | null>(null);

  // Contas da BM
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [linkedSet, setLinkedSet] = useState<Set<string>>(new Set());
  const [accLoading, setAccLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [permWarn, setPermWarn] = useState<Array<{ id: string; label: string }>>([]);

  useEffect(() => {
    if (USE_MOCK) {
      setBusinesses(MOCK_BUSINESSES);
      setBmLoading(false);
      return;
    }
    fetch("/api/meta/businesses")
      .then((r) => r.json())
      .then((j) => setBusinesses((j.businesses ?? []) as Business[]))
      .catch(() => {})
      .finally(() => setBmLoading(false));
  }, []);

  function chooseBm(b: Business) {
    setBm(b);
    setStep("accounts");
    setQ("");
    setError(null);
    setAccLoading(true);

    if (USE_MOCK) {
      const list = MOCK_ACCOUNTS.filter((a) => a.metaBusinessId === b.metaBusinessId);
      setAccounts(list);
      setLinkedSet(new Set([...MOCK_LINKED].filter((id) => list.some((a) => a.metaAdAccountId === id))));
      setSelected(new Set([...MOCK_LINKED].filter((id) => list.some((a) => a.metaAdAccountId === id))));
      setAccLoading(false);
      return;
    }

    Promise.all([
      fetch(`/api/meta/account-options?metaBusinessId=${encodeURIComponent(b.metaBusinessId)}`).then((r) => r.json()),
      fetch("/api/meta/ad-accounts").then((r) => r.json())
    ])
      .then(([opts, linked]) => {
        const list = (opts.accounts ?? []) as Account[];
        const linkedIds = new Set<string>(
          ((linked.accounts ?? []) as Array<{ metaAdAccountId: string }>).map((a) => a.metaAdAccountId)
        );
        const linkedHere = new Set([...linkedIds].filter((id) => list.some((a) => a.metaAdAccountId === id)));
        setAccounts(list);
        setLinkedSet(linkedHere);
        setSelected(new Set(linkedHere));
      })
      .catch(() => {})
      .finally(() => setAccLoading(false));
  }

  function backToBm() {
    setStep("bm");
    setBm(null);
    setAccounts([]);
    setSelected(new Set());
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return accounts;
    return accounts.filter(
      (a) => a.label.toLowerCase().includes(needle) || a.metaAdAccountId.toLowerCase().includes(needle)
    );
  }, [accounts, q]);

  const allSelected = filtered.length > 0 && filtered.every((a) => selected.has(a.metaAdAccountId));
  const toImport = useMemo(() => [...selected].filter((id) => !linkedSet.has(id)), [selected, linkedSet]);

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
    if (USE_MOCK || !toImport.length) {
      router.push("/dashboard");
      return;
    }
    startTransition(async () => {
      setError(null);
      setPermWarn([]);
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
      const noPerm = (j.needsPermission ?? []) as Array<{ id: string; label: string }>;
      if (noPerm.length) {
        // Importou, mas o token não tem permissão nessas contas: avisa antes de seguir.
        setPermWarn(noPerm);
        return;
      }
      router.push("/dashboard");
    });
  }

  function avatarLetter(label: string) {
    return (label.match(/[a-z0-9]/i)?.[0] ?? "C").toUpperCase();
  }
  function fmtSpend(v: number | null) {
    if (v == null) return null;
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <Steps step={step} />

      {step === "bm" ? (
        <>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-main)]">Escolha o Business Manager</h1>
            <p className="mt-1 text-sm text-[var(--text-dim)]">
              Selecione o gerenciador de negócios. Depois você escolhe as contas de anúncio dele.
            </p>
          </div>

          <div className="ui-card divide-y divide-[var(--border-color)] overflow-hidden">
            {bmLoading ? (
              <p className="p-8 text-center text-sm text-[var(--text-dim)]">Carregando…</p>
            ) : businesses.length === 0 ? (
              <p className="p-8 text-center text-sm text-[var(--text-dim)]">Nenhum Business Manager encontrado.</p>
            ) : (
              businesses.map((b) => (
                <button
                  key={b.metaBusinessId}
                  type="button"
                  onClick={() => chooseBm(b)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[var(--surface-thead)]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[rgba(124,58,237,0.06)] text-[var(--violet)]">
                    <Icon d={ICONS.building} className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-[var(--text-main)]">{b.name}</span>
                    <span className="block text-[11px] text-[var(--text-dimmer)]">
                      {b.adAccountCount > 0 ? `${b.adAccountCount} conta(s)` : "ver contas"}
                    </span>
                  </span>
                  <span className="text-[var(--text-dimmer)]">
                    <Icon d={ICONS.chevron} className="h-4 w-4" />
                  </span>
                </button>
              ))
            )}
          </div>

          <div className="flex justify-start">
            <Link href="/dashboard" className="text-sm font-medium text-[var(--text-dim)] hover:text-[var(--text-dim)]">
              Pular por enquanto
            </Link>
          </div>
        </>
      ) : (
        <>
          <div>
            <button
              type="button"
              onClick={backToBm}
              className="mb-2 text-sm ui-link"
            >
              ← Trocar Business Manager
            </button>
            <h1 className="text-2xl font-bold text-[var(--text-main)]">Contas de {bm?.name}</h1>
            <p className="mt-1 text-sm text-[var(--text-dim)]">
              Selecione as contas desta BM para trazer ao painel. Cada conta nova vira um cliente.
              As já vinculadas vêm marcadas — desmarcar não remove nada.
            </p>
          </div>

          <div className="ui-card overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border-color)] px-4 py-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[var(--text-dim)]">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 accent-violet-600" />
                Selecionar todas
              </label>
              <span className="text-xs text-[var(--text-dimmer)]">{selected.size} selecionadas</span>
              <div className="relative ml-auto">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-dimmer)]">
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

            <div className="max-h-[52vh] divide-y divide-[var(--border-color)] overflow-y-auto">
              {accLoading ? (
                <p className="p-8 text-center text-sm text-[var(--text-dim)]">Carregando contas…</p>
              ) : filtered.length === 0 ? (
                <p className="p-8 text-center text-sm text-[var(--text-dim)]">Nenhuma conta nesta BM.</p>
              ) : (
                filtered.map((a) => {
                  const isSel = selected.has(a.metaAdAccountId);
                  const isLinked = linkedSet.has(a.metaAdAccountId);
                  const spend = fmtSpend(a.spendLast30d);
                  return (
                    <label
                      key={a.metaAdAccountId}
                      className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition hover:bg-[var(--surface-thead)] ${
                        isSel ? "bg-[rgba(124,58,237,0.06)]/40" : ""
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
                          isSel ? "bg-[rgba(124,58,237,0.1)] text-violet-700" : "bg-slate-100 text-[var(--text-dim)]"
                        }`}
                      >
                        {avatarLetter(a.label)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-[var(--text-main)]">{a.label}</span>
                          {isLinked ? (
                            <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">
                              Vinculada
                            </span>
                          ) : null}
                        </span>
                        <span className="block truncate text-[11px] text-[var(--text-dimmer)]">{a.metaAdAccountId}</span>
                      </span>
                      {spend ? (
                        <span className="shrink-0 text-right text-[11px] text-[var(--text-dimmer)]">
                          <span className="block font-medium text-[var(--text-dim)]">{spend}</span>
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

          {permWarn.length ? (
            <div className="ui-alert-warning px-4 py-3 text-sm text-amber-800">
              <p className="font-medium">Contas importadas, mas sem permissão na Meta</p>
              <p className="mt-0.5 text-xs">
                Estas contas foram vinculadas, porém o acesso (ads_read/ads_management) ainda não foi
                concedido ao app — os dados delas não vão aparecer até reconectar a Meta liberando o
                acesso a elas:
              </p>
              <ul className="mt-1.5 list-disc pl-5 text-xs font-medium">
                {permWarn.map((p) => (
                  <li key={p.id}>{p.label}</li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="mt-2 text-xs ui-link"
              >
                Entendi, ir para o painel →
              </button>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3">
            <button type="button" onClick={backToBm} className="text-sm font-medium text-[var(--text-dim)] hover:text-[var(--text-dim)]">
              Voltar
            </button>
            <button type="button" onClick={continuar} disabled={isPending} className="ui-btn-primary disabled:opacity-60">
              {isPending
                ? "Importando…"
                : toImport.length
                  ? `Importar ${toImport.length} ${toImport.length === 1 ? "conta" : "contas"}`
                  : "Continuar"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
