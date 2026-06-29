"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import {
  Building2,
  CreditCard,
  Facebook,
  Search,
  Tag,
  X
} from "lucide-react";
import { useMemo } from "react";

import { FilterTextField } from "@/components/FilterTextField";
import { ChoiceCardCheck } from "@/components/campaign-creator/BudgetChoiceCard";
import { PageTitleBlock } from "@/design-system/components/PageTitleBlock";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import {
  ClientCreateSidebar,
  ClientCreateWizardNav
} from "@/uxpilot-ui/adapters/ClientCreateSidebar";
import { UxHorizontalStepper } from "@/uxpilot-ui/adapters/ux-wizard-primitives";
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

  function goNext() {
    if (w.step === 1 && w.canContinueStep1) w.setStep(2);
    else if (w.step === 2 && w.canContinueStep2) w.setStep(3);
    else if (w.step === 3 && w.canContinueStep3) w.setStep(4);
  }

  function handleCreate() {
    w.create(onCreated, () => {});
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="campaign-creator-header shrink-0 px-4 pb-3 pt-3 lg:pl-8 lg:pr-4 lg:pb-4 lg:pt-4">
        <div className="flex items-start justify-between gap-3">
          <PageTitleBlock
            className="flex-1"
            title={tW("pageTitle")}
            subtitle={tW("pageSubtitle")}
            titleIcon={<Building2 size={16} aria-hidden />}
          />
          <button
            type="button"
            onClick={() => router.push("/clients")}
            aria-label={tW("cancel")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-opacity hover:opacity-80 lg:h-8 lg:w-8"
          >
            <X size={20} strokeWidth={2} className="text-[var(--text-dim)]" />
          </button>
        </div>
      </header>

      {metaErrorMessage ? (
        <div className="mx-4 mb-2 ui-alert-danger px-4 py-3 text-sm lg:mx-8">{metaErrorMessage}</div>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[auto_1fr] gap-x-8 overflow-x-visible overflow-y-hidden px-4 lg:grid-cols-[minmax(0,1fr)_16rem] lg:pl-8 lg:pr-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="campaign-creator-stepper-row col-start-1 row-start-1 flex shrink-0 items-center gap-3 border-b border-[var(--border-color)] py-2 lg:gap-4 lg:py-1.5">
          <div className="min-w-0 flex-1 overflow-x-auto">
            <div className="campaign-creator-stepper w-full lg:max-w-none">
              <UxHorizontalStepper
                size="mini"
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
          </div>
        </div>

        <main className="campaign-creator-main-scroll relative col-start-1 row-start-2 flex min-h-0 min-w-0 w-full flex-col overflow-y-auto py-3">
          <div className="campaign-creator-main-scroll__inner w-full pb-6">
            <div className="campaign-creator-section-stack">
              {w.step === 1 ? (
                <div className="animate-fade-up space-y-4">
                  <div>
                    <h2 className="font-heading text-base font-semibold text-[var(--text-main)]">
                      {tW("title")}
                    </h2>
                    <p className="mt-1 text-xs text-[var(--text-dim)]">{tW("titleHint")}</p>
                  </div>

                  {w.metaAdsConnected === false ? (
                    <div className="ui-alert-warning text-sm">
                      <p>{tW("metaAdsRequiredHint")}</p>
                      <Link
                        href="/settings?tab=integrations"
                        className="ui-link mt-1 inline-block text-xs font-semibold underline"
                      >
                        {tW("goConnectMetaAds")}
                      </Link>
                    </div>
                  ) : null}

                  {w.inventoryEmpty ? (
                    <div className="campaign-creator-copy-card campaign-creator-copy-card--lead text-sm">
                      <div className="campaign-creator-copy-card__content">
                        <span className="text-[var(--text-dim)]">
                          {tW("emptyInventory")}{" "}
                          <Link href="/settings/meta-assets" className="font-semibold text-[var(--ui-accent)] underline">
                            {tW("goMetaAssets")}
                          </Link>
                        </span>
                      </div>
                    </div>
                  ) : null}

                  <section className="campaign-creator-card">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (w.canContinueStep1) w.setStep(2);
                      }}
                    >
                      <FilterTextField
                        creatorField
                        icon={<Tag size={13} />}
                        label={tW("clientName")}
                        placeholder={tW("namePlaceholder")}
                        value={w.name}
                        onChange={w.setName}
                      />
                    </form>
                  </section>
                </div>
              ) : null}

              {w.step === 2 ? (
                <div className="animate-fade-up space-y-4">
                  <div>
                    <h2 className="font-heading text-base font-semibold text-[var(--text-main)]">
                      {tW("pickBm")}
                    </h2>
                    <p className="mt-1 text-xs text-[var(--text-dim)]">{tW("pickBmHint")}</p>
                  </div>

                  <section className="campaign-creator-card space-y-3">
                    <FilterTextField
                      creatorField
                      icon={<Search size={13} />}
                      label={tW("stepBm")}
                      placeholder={tW("bmSearchPlaceholder")}
                      value={w.bmSearch}
                      onChange={w.setBmSearch}
                    />

                    <div className="campaign-creator-sidebar-card-inset max-h-[min(28rem,calc(100vh-14rem))] space-y-2 overflow-y-auto p-2">
                      {w.filteredBusinesses.length === 0 ? (
                        <p className="px-2 py-8 text-center text-sm text-[var(--text-dim)]">
                          {tW("noAvailableAccounts")}
                        </p>
                      ) : (
                        w.filteredBusinesses.map((bm) => {
                          const selected = w.selectedBm === bm.metaBusinessId;
                          return (
                            <button
                              key={bm.metaBusinessId}
                              type="button"
                              role="radio"
                              aria-checked={selected}
                              onClick={() => w.selectBusiness(bm.metaBusinessId)}
                              className={cn(
                                "campaign-creator-budget-choice-card campaign-creator-budget-choice-card--row w-full",
                                selected
                                  ? "campaign-creator-budget-choice-card--selected"
                                  : "campaign-creator-budget-choice-card--unselected"
                              )}
                            >
                              <ChoiceCardCheck selected={selected} />
                              <span
                                className={cn(
                                  "campaign-creator-budget-choice-card__icon campaign-creator-budget-choice-card__icon--inline",
                                  selected
                                    ? "campaign-creator-budget-choice-card__icon--selected"
                                    : "campaign-creator-budget-choice-card__icon--unselected"
                                )}
                                aria-hidden
                              >
                                <Building2 size={18} strokeWidth={1.75} />
                              </span>
                              <span className="campaign-creator-budget-choice-card__content">
                                <span className="campaign-creator-budget-choice-card__title-row">
                                  <span className="campaign-creator-budget-choice-card__label campaign-creator-budget-choice-card__label--inline">
                                    {bm.name}
                                  </span>
                                </span>
                                <span className="campaign-creator-budget-choice-card__description">
                                  {tW("bmCountsAccountsOnly", { accounts: bm.adAccountCount })}
                                </span>
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </section>
                </div>
              ) : null}

              {w.step === 3 ? (
                <div className="animate-fade-up space-y-4">
                  <div>
                    <h2 className="font-heading text-base font-semibold text-[var(--text-main)]">
                      {tW("chooseAccounts")}
                    </h2>
                    <p className="mt-1 text-xs text-[var(--text-dim)]">
                      {tW("chooseAccountsHint")}
                      {w.selectedBmName ? (
                        <span className="mt-1 block text-[var(--ui-accent)]">BM: {w.selectedBmName}</span>
                      ) : null}
                    </p>
                  </div>

                  <section className="campaign-creator-card space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-full border border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)] px-2.5 py-0.5 font-heading text-[11px] font-semibold text-[var(--ui-accent)]">
                        {tW("selectedCount", { count: w.selected.size })}
                      </span>
                      <span className="campaign-creator-orion-section-label">{tW("spentLast30d")}</span>
                    </div>

                    <FilterTextField
                      creatorField
                      icon={<Search size={13} />}
                      label={tW("stepAccounts")}
                      placeholder={tW("searchAccounts")}
                      value={w.accountSearch}
                      onChange={w.setAccountSearch}
                    />

                    <div className="campaign-creator-sidebar-card-inset max-h-[min(36rem,calc(100vh-12rem))] space-y-2 overflow-y-auto p-2">
                      {w.loadingAccounts ? (
                        <p className="px-4 py-8 text-center text-sm text-[var(--text-dim)]">
                          {tW("loadingAccounts")}
                        </p>
                      ) : w.filteredAccounts.length === 0 ? (
                        <p className="px-4 py-8 text-center text-sm text-[var(--text-dim)]">
                          {tW("noAvailableAccounts")}
                        </p>
                      ) : (
                        w.filteredAccounts.map((acc) => {
                          const checked = w.selected.has(acc.metaAdAccountId);
                          return (
                            <button
                              key={acc.metaAdAccountId}
                              type="button"
                              aria-pressed={checked}
                              onClick={() => w.toggleAccount(acc.metaAdAccountId)}
                              className={cn(
                                "campaign-creator-budget-choice-card campaign-creator-budget-choice-card--row w-full",
                                checked
                                  ? "campaign-creator-budget-choice-card--selected"
                                  : "campaign-creator-budget-choice-card--unselected"
                              )}
                            >
                              <ChoiceCardCheck selected={checked} />
                              <span
                                className={cn(
                                  "campaign-creator-budget-choice-card__icon campaign-creator-budget-choice-card__icon--inline",
                                  checked
                                    ? "campaign-creator-budget-choice-card__icon--selected"
                                    : "campaign-creator-budget-choice-card__icon--unselected"
                                )}
                                aria-hidden
                              >
                                <CreditCard size={18} strokeWidth={1.75} />
                              </span>
                              <span className="campaign-creator-budget-choice-card__content min-w-0">
                                <span className="campaign-creator-budget-choice-card__title-row">
                                  <span className="campaign-creator-budget-choice-card__label campaign-creator-budget-choice-card__label--inline truncate">
                                    {acc.label}
                                  </span>
                                  <span className="shrink-0 text-sm font-semibold text-[var(--text-dim)]">
                                    {w.formatSpend(acc.spendLast30d)}
                                  </span>
                                </span>
                                <span className="campaign-creator-budget-choice-card__description truncate">
                                  ID: {acc.metaAdAccountId}
                                </span>
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </section>

                  {w.error ? (
                    <div className="ui-alert-danger px-4 py-3 text-sm">{w.error}</div>
                  ) : null}
                </div>
              ) : null}

              {w.step === 4 ? (
                <div className="animate-fade-up space-y-4">
                  <div>
                    <h2 className="font-heading text-base font-semibold text-[var(--text-main)]">
                      {tW("stepPageTitle")}
                    </h2>
                    <p className="mt-1 text-xs text-[var(--text-dim)]">{tW("stepPageHint")}</p>
                  </div>

                  <section className="campaign-creator-card space-y-4">
                    {w.loadingWizardAssets ? (
                      <p className="text-sm text-[var(--text-dim)]">{tW("loadingWizardAssets")}</p>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <div>
                            <h3 className="campaign-creator-section-title">{tW("selectPageRequired")}</h3>
                            <p className="mt-1 text-xs text-[var(--text-dim)]">{tW("stepPageHint")}</p>
                          </div>
                          {w.wizardPages.length === 0 ? (
                            <div className="ui-alert-warning text-xs">
                              {tW("noPagesWizard")}{" "}
                              <Link href="/settings/meta-assets" className="ui-link font-semibold">
                                {tW("goMetaAssets")}
                              </Link>
                            </div>
                          ) : (
                            <div className="campaign-creator-sidebar-card-inset max-h-56 space-y-2 overflow-y-auto p-2">
                              {w.wizardPages.map((p) => {
                                const selected = w.selectedPageId === p.metaPageId;
                                return (
                                  <button
                                    key={p.metaPageId}
                                    type="button"
                                    role="radio"
                                    aria-checked={selected}
                                    onClick={() => w.setSelectedPageId(p.metaPageId)}
                                    className={cn(
                                      "campaign-creator-budget-choice-card campaign-creator-budget-choice-card--row w-full",
                                      selected
                                        ? "campaign-creator-budget-choice-card--selected"
                                        : "campaign-creator-budget-choice-card--unselected"
                                    )}
                                  >
                                    <ChoiceCardCheck selected={selected} />
                                    <span
                                      className={cn(
                                        "campaign-creator-budget-choice-card__icon campaign-creator-budget-choice-card__icon--inline",
                                        selected
                                          ? "campaign-creator-budget-choice-card__icon--selected"
                                          : "campaign-creator-budget-choice-card__icon--unselected"
                                      )}
                                      aria-hidden
                                    >
                                      <Facebook size={18} strokeWidth={1.75} />
                                    </span>
                                    <span className="campaign-creator-budget-choice-card__content">
                                      <span className="campaign-creator-budget-choice-card__title-row">
                                        <span className="campaign-creator-budget-choice-card__label campaign-creator-budget-choice-card__label--inline">
                                          {p.name}
                                        </span>
                                      </span>
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div>
                            <h3 className="campaign-creator-section-title">{tW("selectPixelsOptional")}</h3>
                            <p className="mt-1 text-xs text-[var(--text-dim)]">{tW("selectPixelsHint")}</p>
                          </div>
                          {w.wizardPixels.length === 0 ? (
                            <p className="text-xs text-[var(--text-dimmer)]">{tW("noPixelsWizard")}</p>
                          ) : (
                            <div className="campaign-creator-sidebar-card-inset max-h-48 space-y-2 overflow-y-auto p-2">
                              {w.wizardPixels.map((px) => {
                                const checked = w.selectedPixelIds.has(px.id);
                                return (
                                  <button
                                    key={px.id}
                                    type="button"
                                    aria-pressed={checked}
                                    onClick={() => w.togglePixel(px.id)}
                                    className={cn(
                                      "campaign-creator-budget-choice-card campaign-creator-budget-choice-card--row w-full",
                                      checked
                                        ? "campaign-creator-budget-choice-card--selected"
                                        : "campaign-creator-budget-choice-card--unselected"
                                    )}
                                  >
                                    <ChoiceCardCheck selected={checked} />
                                    <span className="campaign-creator-budget-choice-card__content text-left">
                                      <span className="campaign-creator-budget-choice-card__label campaign-creator-budget-choice-card__label--inline text-xs">
                                        {px.name}{" "}
                                        <span className="text-[var(--text-dimmer)]">({px.id})</span>
                                      </span>
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </section>

                  {w.error ? (
                    <div className="ui-alert-danger px-4 py-3 text-sm">{w.error}</div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </main>

        <ClientCreateSidebar
          w={w}
          tW={tW}
          goBack={goBack}
          onNext={goNext}
          onCreate={handleCreate}
        />
      </div>

      <div className="campaign-creator-footer-outer shrink-0 lg:hidden">
        <div className="campaign-creator-footer-band">
          <ClientCreateWizardNav
            w={w}
            tBack={tW("back")}
            tNext={tW("next")}
            tCreate={tW("create")}
            tCreating={tW("creating")}
            goBack={goBack}
            onNext={goNext}
            onCreate={handleCreate}
            className="ui-wizard-nav--footer"
          />
        </div>
      </div>
    </div>
  );
}
