"use client";

import { useLocale, useTranslations } from "next-intl";
import { Building2, Check, Megaphone, Search, Sparkles, User } from "lucide-react";

import { Link, useRouter } from "@/i18n/navigation";
import {
  UxCircularProgress,
  UxFormCard,
  UxScoreItem,
  UxStepItem,
  UxWizardHeader
} from "@/uxpilot-ui/adapters/ux-wizard-primitives";
import { useCreateClientWizard } from "@/uxpilot-ui/adapters/useCreateClientWizard";

const STEPS = [
  { number: 1 as const, label: "Nome do cliente", sublabel: "Identificação básica", icon: User },
  { number: 2 as const, label: "Business Manager", sublabel: "Selecionar BM vinculado", icon: Building2 },
  { number: 3 as const, label: "Contas de anúncio", sublabel: "Conectar ad accounts", icon: Megaphone }
];

export function ClientsCreateContentLive() {
  const t = useTranslations("clientsHub");
  const tW = useTranslations("clientsHub.createWizard");
  const locale = useLocale();
  const router = useRouter();
  const w = useCreateClientWizard(locale);

  function onCreated() {
    router.push("/clients");
    router.refresh();
  }

  return (
    <div
      className="-mx-4 -my-5 flex min-h-[calc(100vh-5rem)] flex-col overflow-hidden md:-mx-6"
      style={{ background: "var(--surface-bg)" }}
    >
      <UxWizardHeader
        breadcrumbParent={t("title")}
        breadcrumbParentHref="/clients"
        breadcrumbCurrent="Novo Cliente"
        title="Criar novo cliente"
        onBack={() => router.push("/clients")}
        showBack={false}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div
          className="hidden w-56 shrink-0 flex-col border-r lg:flex"
          style={{ background: "var(--surface-bg)", borderColor: "var(--border-color)" }}
        >
          <div className="flex-1 overflow-y-auto px-4 py-6">
          <p
            className="mb-5 px-1 font-heading text-[10px] font-bold tracking-widest"
            style={{ color: "var(--text-dimmer)" }}
          >
            ETAPAS
          </p>
          <div className="relative flex flex-col">
            <div
              className="absolute bottom-8 left-[18px] top-8 w-px"
              style={{ background: "var(--border-color)" }}
            />
            {STEPS.map((s) => (
              <UxStepItem
                key={s.number}
                stepNum={s.number}
                label={s.label}
                sublabel={s.sublabel}
                active={w.step === s.number}
                completed={w.step > s.number}
                disabled={
                  s.number === 2 ? !w.canContinueStep1 : s.number === 3 ? !w.canContinueStep2 : false
                }
                onClick={() => {
                  if (s.number === 1) w.setStep(1);
                  if (s.number === 2 && w.canContinueStep1) w.setStep(2);
                  if (s.number === 3 && w.canContinueStep2) w.setStep(3);
                }}
              />
            ))}
          </div>
          </div>
          <div className="shrink-0 border-t px-4 py-5" style={{ borderColor: "var(--border-color)" }}>
            <Link
              href="/clients"
              className="block w-full rounded-xl border px-4 py-2.5 text-center font-heading text-sm font-semibold"
              style={{ borderColor: "var(--border-color)", color: "var(--text-dim)", background: "var(--surface-bg)" }}
            >
              Fechar
            </Link>
          </div>
        </div>

        <div className="min-w-0 flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
          <div className="mx-auto max-w-2xl space-y-5 px-8 py-7">
            {w.step === 1 ? (
              <div className="animate-fade-up space-y-5">
                <div>
                  <h2 className="font-heading text-lg font-bold" style={{ color: "var(--text-main)" }}>
                    {tW("title")}
                  </h2>
                  <p className="mt-1 font-body text-sm" style={{ color: "var(--text-dim)" }}>
                    Defina o nome que identificará este cliente na plataforma.
                  </p>
                </div>
                {w.inventoryEmpty ? (
                  <div className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "rgba(245,166,35,0.3)", background: "rgba(245,166,35,0.08)", color: "var(--text-dim)" }}>
                    {tW("emptyInventory")}{" "}
                    <Link href="/settings/meta-assets" className="font-semibold underline" style={{ color: "var(--amber)" }}>
                      {tW("goMetaAssets")}
                    </Link>
                  </div>
                ) : null}
                <UxFormCard>
                  <label className="font-body text-sm font-medium" style={{ color: "var(--text-main)" }}>
                    {tW("clientName")}
                  </label>
                  <input
                    value={w.name}
                    onChange={(e) => w.setName(e.target.value)}
                    placeholder={t("newClientPlaceholder")}
                    autoFocus
                    className="mt-2 w-full rounded-xl border px-4 py-3 font-body text-sm outline-none transition-all"
                    style={{
                      background: "var(--surface-bg)",
                      borderColor: "var(--border-color)",
                      color: "var(--text-main)"
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && w.canContinueStep1) w.setStep(2);
                    }}
                  />
                </UxFormCard>
              </div>
            ) : null}

            {w.step === 2 ? (
              <div className="animate-fade-up space-y-5">
                <div>
                  <h2 className="font-heading text-lg font-bold" style={{ color: "var(--text-main)" }}>
                    {tW("pickBm")}
                  </h2>
                  <p className="mt-1 font-body text-sm" style={{ color: "var(--text-dim)" }}>
                    Selecione o Business Manager vinculado a este cliente.
                  </p>
                </div>
                <UxFormCard>
                  <div className="relative mb-3">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2"
                      style={{ color: "var(--text-dimmer)" }}
                    />
                    <input
                      value={w.bmSearch}
                      onChange={(e) => w.setBmSearch(e.target.value)}
                      placeholder="Buscar Business Manager..."
                      className="w-full rounded-xl border py-2.5 pl-9 pr-3 font-body text-sm outline-none"
                      style={{
                        background: "var(--surface-bg)",
                        borderColor: "var(--border-color)",
                        color: "var(--text-main)"
                      }}
                    />
                  </div>
                  <div
                    className="overflow-y-auto rounded-xl border"
                    style={{ maxHeight: 320, borderColor: "var(--border-color)", background: "var(--surface-bg)" }}
                  >
                    {w.filteredBusinesses.length === 0 ? (
                      <p className="px-4 py-8 text-center font-body text-sm" style={{ color: "var(--text-dim)" }}>
                        {tW("noAvailableAccounts")}
                      </p>
                    ) : (
                      w.filteredBusinesses.map((bm, i) => (
                        <button
                          key={bm.metaBusinessId}
                          type="button"
                          onClick={() => w.selectBusiness(bm.metaBusinessId)}
                          className="flex w-full items-center justify-between px-4 py-3 text-left font-body text-sm transition-all"
                          style={{
                            borderBottom:
                              i < w.filteredBusinesses.length - 1 ? "1px solid var(--border-color)" : "none",
                            background:
                              w.selectedBm === bm.metaBusinessId ? "rgba(245,166,35,0.07)" : "transparent"
                          }}
                        >
                          <span className="font-medium" style={{ color: "var(--text-main)" }}>
                            {bm.name}
                          </span>
                          <span className="text-xs" style={{ color: "var(--text-dimmer)" }}>
                            {tW("bmCounts", { accounts: bm.adAccountCount, pages: bm.pageCount })}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </UxFormCard>
              </div>
            ) : null}

            {w.step === 3 ? (
              <div className="animate-fade-up space-y-5">
                <div>
                  <h2 className="font-heading text-lg font-bold" style={{ color: "var(--text-main)" }}>
                    {tW("chooseAccounts")}
                  </h2>
                  <p className="mt-1 font-body text-sm" style={{ color: "var(--text-dim)" }}>
                    {tW("chooseAccountsHint")}
                  </p>
                </div>
                <UxFormCard>
                  <div className="mb-3 flex items-center justify-between">
                    <span
                      className="rounded px-2 py-0.5 font-heading text-xs font-semibold"
                      style={{
                        background: "rgba(245,166,35,0.1)",
                        color: "var(--amber)",
                        border: "1px solid rgba(245,166,35,0.3)"
                      }}
                    >
                      {w.selected.size} selecionada(s)
                    </span>
                    <span className="font-body text-xs uppercase tracking-wider" style={{ color: "var(--text-dimmer)" }}>
                      {tW("spentLast30d")}
                    </span>
                  </div>
                  <div className="relative mb-3">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2"
                      style={{ color: "var(--text-dimmer)" }}
                    />
                    <input
                      value={w.accountSearch}
                      onChange={(e) => w.setAccountSearch(e.target.value)}
                      placeholder={tW("searchAccounts")}
                      className="w-full rounded-xl border py-2.5 pl-9 pr-3 font-body text-sm outline-none"
                      style={{
                        background: "var(--surface-bg)",
                        borderColor: "var(--border-color)",
                        color: "var(--text-main)"
                      }}
                    />
                  </div>
                  <div
                    className="overflow-y-auto rounded-xl border"
                    style={{ maxHeight: 360, borderColor: "var(--border-color)", background: "var(--surface-bg)" }}
                  >
                    {w.loadingAccounts ? (
                      <p className="px-4 py-8 text-center font-body text-sm" style={{ color: "var(--text-dim)" }}>
                        {tW("loadingAccounts")}
                      </p>
                    ) : w.filteredAccounts.length === 0 ? (
                      <p className="px-4 py-8 text-center font-body text-sm" style={{ color: "var(--text-dim)" }}>
                        {tW("noAvailableAccounts")}
                      </p>
                    ) : (
                      w.filteredAccounts.map((acc) => {
                        const checked = w.selected.has(acc.metaAdAccountId);
                        return (
                          <label
                            key={acc.metaAdAccountId}
                            className="flex cursor-pointer items-center gap-3 border-b px-4 py-3 last:border-b-0"
                            style={{
                              borderColor: "var(--border-color)",
                              background: checked ? "rgba(245,166,35,0.06)" : "transparent"
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => w.toggleAccount(acc.metaAdAccountId)}
                              className="h-4 w-4 rounded accent-[#f5a623]"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-body text-sm font-medium" style={{ color: "var(--text-main)" }}>
                                {acc.label}
                              </div>
                              <div className="truncate font-body text-xs" style={{ color: "var(--text-dimmer)" }}>
                                ID: {acc.metaAdAccountId}
                              </div>
                            </div>
                            <div className="shrink-0 font-body text-sm font-semibold" style={{ color: "var(--text-dim)" }}>
                              {w.formatSpend(acc.spendLast30d)}
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </UxFormCard>
                {w.error ? (
                  <div className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "rgba(239,68,68,0.3)", color: "#ef4444" }}>
                    {w.error}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div
          className="hidden w-60 shrink-0 flex-col border-l xl:flex"
          style={{ background: "var(--surface-bg)", borderColor: "var(--border-color)" }}
        >
          <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5">
          <div>
            <p className="mb-3 font-heading text-sm font-bold" style={{ color: "var(--text-main)" }}>
              Progresso
            </p>
            <div className="flex items-start gap-3">
              <UxCircularProgress value={w.score} />
              <p className="mt-1 font-body text-xs leading-relaxed" style={{ color: "var(--text-dim)" }}>
                Preencha todos os campos para completar o cliente.
              </p>
            </div>
          </div>
          <div style={{ height: 1, background: "var(--border-color)" }} />
          <div>
            <p className="mb-1 font-heading text-sm font-bold" style={{ color: "var(--text-main)" }}>
              Prévia do cliente
            </p>
            <div
              className="mt-3 overflow-hidden rounded-2xl"
              style={{ border: "1px solid var(--border-color)", background: "var(--surface-bg)" }}
            >
              <div
                className="flex h-20 items-center justify-center"
                style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(79,70,229,0.08))" }}
              >
                {w.name.trim() ? (
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl font-heading text-xl font-bold"
                    style={{ background: "rgba(124,58,237,0.2)", color: "#7c3aed" }}
                  >
                    {w.name.trim().charAt(0).toUpperCase()}
                  </div>
                ) : (
                  <Sparkles size={18} style={{ color: "#7c3aed" }} />
                )}
              </div>
              <div className="p-3" style={{ borderTop: "1px solid var(--border-color)" }}>
                <p className="font-heading text-xs font-bold" style={{ color: "var(--text-main)" }}>
                  {w.name.trim() || "Nome do cliente..."}
                </p>
                <p className="mt-0.5 font-body text-[11px]" style={{ color: "var(--text-dim)" }}>
                  {w.selectedBmName ? `BM: ${w.selectedBmName}` : "Business Manager não selecionado"}
                </p>
                <p className="mt-0.5 font-body text-[11px]" style={{ color: "var(--text-dim)" }}>
                  {w.selected.size > 0
                    ? `${w.selected.size} conta(s) vinculada(s)`
                    : "Sem contas vinculadas"}
                </p>
              </div>
            </div>
          </div>
          <div style={{ height: 1, background: "var(--border-color)" }} />
          <div>
            <p
              className="mb-3 font-heading text-[10px] font-semibold tracking-widest"
              style={{ color: "var(--text-dimmer)" }}
            >
              COMPLETUDE
            </p>
            <div className="space-y-2.5">
              <UxScoreItem label="Nome do cliente" done={w.canContinueStep1} />
              <UxScoreItem label="Business Manager" done={w.canContinueStep2} />
              <UxScoreItem label="Conta de anúncio" done={w.selected.size > 0} />
            </div>
          </div>
          </div>
          <div className="shrink-0 space-y-2 border-t px-4 py-5" style={{ borderColor: "var(--border-color)" }}>
            {w.step > 1 ? (
              <button
                type="button"
                onClick={() => w.setStep((w.step - 1) as 1 | 2 | 3)}
                className="w-full rounded-xl border px-4 py-2.5 font-heading text-sm font-semibold"
                style={{ borderColor: "var(--border-color)", color: "var(--text-dim)", background: "var(--surface-bg)" }}
              >
                {tW("back")}
              </button>
            ) : null}
            {w.step === 1 ? (
              <button
                type="button"
                disabled={!w.canContinueStep1}
                onClick={() => w.setStep(2)}
                className="w-full rounded-xl px-4 py-3 font-heading text-sm font-bold shadow-lg transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #f5a623, #e8920d)",
                  color: "#0f1419",
                  boxShadow: "0 4px 16px rgba(245,166,35,0.35)"
                }}
              >
                Avançar
              </button>
            ) : w.step === 3 ? (
              <button
                type="button"
                disabled={w.isPending || w.selected.size === 0}
                onClick={() => w.create(onCreated, () => {})}
                className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-heading text-sm font-bold shadow-lg transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  background: "linear-gradient(135deg, #f5a623, #e8920d)",
                  color: "#0f1419",
                  boxShadow: "0 4px 16px rgba(245,166,35,0.35)"
                }}
              >
                <Check size={14} />
                {w.isPending ? tW("creating") : tW("create")}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
