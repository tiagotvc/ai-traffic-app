"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Check, ChevronRight, Search, X } from "lucide-react";
import { useMemo } from "react";

import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { UxFormCard, UxHorizontalStepper } from "@/uxpilot-ui/adapters/ux-wizard-primitives";
import { useCreateClientWizard } from "@/uxpilot-ui/adapters/useCreateClientWizard";

const META_ERROR_MESSAGES: Record<string, string> = {
  access_denied: "Conexão Meta cancelada. Tente novamente.",
  invalid_state: "Sessão OAuth expirada. Conecte novamente.",
  oauth_failed: "Falha ao conectar Meta. Tente novamente."
};

export function ClientsCreateContentLive() {
  const tW = useTranslations("clientsHub.createWizard");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const metaConnected = searchParams.get("metaConnected") === "1";
  const metaError = searchParams.get("metaError");
  const w = useCreateClientWizard(locale, { metaConnected });

  const metaErrorMessage = useMemo(() => {
    if (!metaError) return null;
    return META_ERROR_MESSAGES[metaError] ?? tW("metaOAuthFailed");
  }, [metaError, tW]);

  const steps = [
    { number: 1 as const, label: tW("stepName") },
    { number: 2 as const, label: tW("stepBm") },
    { number: 3 as const, label: tW("stepAccounts") },
    { number: 4 as const, label: tW("stepPagePixels") }
  ];

  function onCreated(slug: string) {
    window.dispatchEvent(new Event("traffic:campaigns-reload"));
    if (slug) {
      router.push(`/clients/${encodeURIComponent(slug)}?syncing=1`);
    } else {
      router.push("/clients");
    }
    router.refresh();
  }

  function goToStep(n: number) {
    if (n === 1) w.setStep(1);
    if (n === 2 && w.canContinueStep1) w.setStep(2);
    if (n === 3 && w.canContinueStep2) w.setStep(3);
    if (n === 4 && w.canContinueStep3) w.setStep(4);
  }

  function goBack() {
    if (w.step > 1) w.setStep((w.step - 1) as 1 | 2 | 3 | 4);
    else router.push("/clients");
  }

  return (
    <div
      className="-mx-4 -my-5 flex min-h-[calc(100vh-5rem)] flex-col overflow-hidden md:-mx-6"
      style={{ background: "var(--surface-bg)" }}
    >
      <header className="px-4 pt-6 sm:px-6 sm:pt-8">
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-heading text-xl font-bold sm:text-2xl" style={{ color: "var(--text-main)" }}>
            {tW("pageTitle")}
          </h1>
          <button
            type="button"
            onClick={() => router.push("/clients")}
            aria-label={tW("cancel")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-opacity hover:opacity-80"
          >
            <X size={22} strokeWidth={2} style={{ color: "var(--ui-accent)" }} />
          </button>
        </div>
        <p className="mt-1 font-body text-sm" style={{ color: "var(--text-dim)" }}>
          {tW("pageSubtitle")}
        </p>
      </header>

      {metaErrorMessage ? (
        <div className="mx-4 mt-4 rounded-xl border px-4 py-3 text-sm sm:mx-6" style={{ borderColor: "rgba(239,68,68,0.3)", color: "#ef4444" }}>
          {metaErrorMessage}
        </div>
      ) : null}

      <div className="px-4 py-6 sm:px-6 sm:py-8">
        <UxHorizontalStepper
          steps={steps.map((s) => ({
            ...s,
            disabled:
              s.number === 2
                ? !w.canContinueStep1
                : s.number === 3
                  ? !w.canContinueStep2
                  : s.number === 4
                    ? !w.canContinueStep3
                    : false
          }))}
          current={w.step}
          onStepClick={goToStep}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
        <div className="mx-auto max-w-xl space-y-5 px-4 pb-6 sm:px-6 sm:pb-8">
          {w.step === 1 ? (
            <div className="animate-fade-up space-y-4">
              <div>
                <h2 className="font-heading text-lg font-bold" style={{ color: "var(--text-main)" }}>
                  {tW("title")}
                </h2>
                <p className="mt-1 font-body text-sm" style={{ color: "var(--text-dim)" }}>
                  {tW("titleHint")}
                </p>
              </div>
              {w.metaAdsConnected === false ? (
                <div className="ui-alert-warning text-sm">
                  <p>{tW("metaAdsRequiredHint")}</p>
                  <Link href="/settings?tab=integrations" className="ui-link mt-1 inline-block text-xs font-semibold underline">
                    {tW("goConnectMetaAds")}
                  </Link>
                </div>
              ) : null}
              {w.inventoryEmpty ? (
                <div
                  className="rounded-xl border px-4 py-3 text-sm"
                  style={{
                    borderColor: "var(--ui-accent-border)",
                    background: "var(--ui-accent-muted)",
                    color: "var(--text-dim)"
                  }}
                >
                  {tW("emptyInventory")}{" "}
                  <Link
                    href="/settings/meta-assets"
                    className="font-semibold underline"
                    style={{ color: "var(--ui-accent)" }}
                  >
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
                  placeholder={tW("namePlaceholder")}
                  autoFocus
                  className="ui-input mt-2 w-full"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && w.canContinueStep1) w.setStep(2);
                  }}
                />
              </UxFormCard>
            </div>
          ) : null}

          {w.step === 2 ? (
            <div className="animate-fade-up space-y-4">
              <div>
                <h2 className="font-heading text-lg font-bold" style={{ color: "var(--text-main)" }}>
                  {tW("pickBm")}
                </h2>
                <p className="mt-1 font-body text-sm" style={{ color: "var(--text-dim)" }}>
                  {tW("pickBmHint")}
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
                    placeholder={tW("bmSearchPlaceholder")}
                    className="ui-input w-full py-2.5 pl-9 pr-3"
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
                            w.selectedBm === bm.metaBusinessId ? "var(--ui-accent-muted)" : "transparent"
                        }}
                      >
                        <span className="font-medium" style={{ color: "var(--text-main)" }}>
                          {bm.name}
                        </span>
                        <span className="text-xs" style={{ color: "var(--text-dimmer)" }}>
                          {tW("bmCountsAccountsOnly", { accounts: bm.adAccountCount })}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </UxFormCard>
            </div>
          ) : null}

          {w.step === 3 ? (
            <div className="animate-fade-up space-y-4">
              <div>
                <h2 className="font-heading text-lg font-bold" style={{ color: "var(--text-main)" }}>
                  {tW("chooseAccounts")}
                </h2>
                <p className="mt-1 font-body text-sm" style={{ color: "var(--text-dim)" }}>
                  {tW("chooseAccountsHint")}
                  {w.selectedBmName ? (
                    <span className="mt-1 block text-xs" style={{ color: "var(--ui-accent)" }}>
                      BM: {w.selectedBmName}
                    </span>
                  ) : null}
                </p>
              </div>
              <UxFormCard>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span
                    className="rounded px-2 py-0.5 font-heading text-xs font-semibold"
                    style={{
                      background: "var(--ui-accent-muted)",
                      color: "var(--ui-accent)",
                      border: "1px solid var(--ui-accent-border)"
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
                    className="ui-input w-full py-2.5 pl-9 pr-3"
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
                            background: checked ? "var(--ui-accent-muted)" : "transparent"
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => w.toggleAccount(acc.metaAdAccountId)}
                            className="h-4 w-4 rounded accent-[var(--ui-accent)]"
                          />
                          <div className="min-w-0 flex-1">
                            <div
                              className="truncate font-body text-sm font-medium"
                              style={{ color: "var(--text-main)" }}
                            >
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
                <div
                  className="rounded-xl border px-4 py-3 text-sm"
                  style={{ borderColor: "rgba(239,68,68,0.3)", color: "#ef4444" }}
                >
                  {w.error}
                </div>
              ) : null}
            </div>
          ) : null}

          {w.step === 4 ? (
            <div className="animate-fade-up space-y-4">
              <div>
                <h2 className="font-heading text-lg font-bold" style={{ color: "var(--text-main)" }}>
                  {tW("stepPageTitle")}
                </h2>
                <p className="mt-1 font-body text-sm" style={{ color: "var(--text-dim)" }}>
                  {tW("stepPageHint")}
                </p>
              </div>
              <UxFormCard>
                {w.loadingWizardAssets ? (
                  <p className="font-body text-sm" style={{ color: "var(--text-dim)" }}>
                    {tW("loadingWizardAssets")}
                  </p>
                ) : (
                  <>
                    <label className="font-body text-sm font-medium" style={{ color: "var(--text-main)" }}>
                      {tW("selectPageRequired")} *
                    </label>
                    {w.wizardPages.length === 0 ? (
                      <div className="ui-alert-warning mt-2 text-xs">
                        {tW("noPagesWizard")}{" "}
                        <Link href="/settings/meta-assets" className="ui-link font-semibold">
                          {tW("goMetaAssets")}
                        </Link>
                      </div>
                    ) : (
                      <select
                        value={w.selectedPageId}
                        onChange={(e) => w.setSelectedPageId(e.target.value)}
                        className="ui-input mt-2 w-full"
                      >
                        <option value="">{tW("selectPagePlaceholder")}</option>
                        {w.wizardPages.map((p) => (
                          <option key={p.metaPageId} value={p.metaPageId}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    )}

                    <div className="mt-4">
                      <div className="font-body text-sm font-medium" style={{ color: "var(--text-main)" }}>
                        {tW("selectPixelsOptional")}
                      </div>
                      <p className="mt-1 text-xs" style={{ color: "var(--text-dim)" }}>
                        {tW("selectPixelsHint")}
                      </p>
                      {w.wizardPixels.length === 0 ? (
                        <p className="mt-2 text-xs" style={{ color: "var(--text-dimmer)" }}>
                          {tW("noPixelsWizard")}
                        </p>
                      ) : (
                        <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-xl border border-[var(--border-color)] p-2">
                          {w.wizardPixels.map((px) => (
                            <label
                              key={px.id}
                              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs"
                            >
                              <input
                                type="checkbox"
                                checked={w.selectedPixelIds.has(px.id)}
                                onChange={() => w.togglePixel(px.id)}
                                className="accent-[var(--ui-accent)]"
                              />
                              <span>
                                {px.name}{" "}
                                <span className="text-[var(--text-dimmer)]">({px.id})</span>
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </UxFormCard>
              {w.error ? (
                <div
                  className="rounded-xl border px-4 py-3 text-sm"
                  style={{ borderColor: "rgba(239,68,68,0.3)", color: "#ef4444" }}
                >
                  {w.error}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 px-4 py-4 sm:px-6">
        <button
          type="button"
          onClick={goBack}
          className="ui-btn-secondary px-4 py-2 text-sm font-heading font-semibold"
        >
          {tW("back")}
        </button>
        {w.step === 1 ? (
          <button
            type="button"
            disabled={!w.canContinueStep1}
            onClick={() => w.setStep(2)}
            className="ui-btn-accent inline-flex items-center gap-1.5 px-5 py-2 text-sm font-heading font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            {tW("next")}
            <ChevronRight size={16} strokeWidth={2.5} />
          </button>
        ) : w.step === 2 ? (
          <button
            type="button"
            disabled={!w.canContinueStep2}
            onClick={() => w.setStep(3)}
            className="ui-btn-accent inline-flex items-center gap-1.5 px-5 py-2 text-sm font-heading font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            {tW("next")}
            <ChevronRight size={16} strokeWidth={2.5} />
          </button>
        ) : w.step === 3 ? (
          <button
            type="button"
            disabled={!w.canContinueStep3}
            onClick={() => w.setStep(4)}
            className="ui-btn-accent inline-flex items-center gap-1.5 px-5 py-2 text-sm font-heading font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            {tW("next")}
            <ChevronRight size={16} strokeWidth={2.5} />
          </button>
        ) : (
          <button
            type="button"
            disabled={w.isPending || !w.canCreate}
            onClick={() => w.create(onCreated, () => {})}
            className={cn(
              "ui-btn-accent inline-flex items-center gap-2 px-5 py-2 text-sm font-heading font-semibold",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
          >
            <Check size={14} />
            {w.isPending ? tW("creating") : tW("create")}
          </button>
        )}
      </div>
    </div>
  );
}
