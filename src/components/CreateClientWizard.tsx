"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Building2, CreditCard, Search, Tag, Users } from "lucide-react";

import { FilterTextField } from "@/components/FilterTextField";
import { CreatorModalShell } from "@/components/campaign-creator/CreatorModalShell";
import { ChoiceCardCheck } from "@/components/campaign-creator/BudgetChoiceCard";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { formatBRL } from "@/lib/format";

type BusinessRow = {
  metaBusinessId: string;
  name: string;
  adAccountCount: number;
  pageCount: number;
};

type AccountOption = {
  metaAdAccountId: string;
  label: string;
  metaBusinessId: string | null;
  metaBusinessName: string | null;
  spendLast30d: number | null;
};

type Step = "name" | "bm" | "accounts";

export function CreateClientWizard({
  onCreated,
  open: controlledOpen,
  onOpenChange
}: {
  onCreated: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const t = useTranslations("clientsHub.createWizard");
  const tHub = useTranslations("clientsHub");
  const locale = useLocale();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [selectedBm, setSelectedBm] = useState("");
  const [inventoryEmpty, setInventoryEmpty] = useState(false);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const reset = () => {
    setStep("name");
    setName("");
    setSelectedBm("");
    setAccounts([]);
    setSelected(new Set());
    setQuery("");
    setError(null);
  };

  const loadBusinesses = useCallback(() => {
    fetch("/api/meta/businesses")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          const rows = j.businesses ?? [];
          setBusinesses(rows);
          setInventoryEmpty(rows.length === 0 && (j.totals?.adAccounts ?? 0) === 0);
        }
      })
      .catch(() => {});
  }, []);

  const loadAccounts = useCallback((bmId: string) => {
    setLoadingAccounts(true);
    setAccounts([]);
    const qs = bmId ? `?metaBusinessId=${encodeURIComponent(bmId)}` : "";
    fetch(`/api/meta/account-options${qs}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setAccounts(j.accounts ?? []);
      })
      .catch(() => {})
      .finally(() => setLoadingAccounts(false));
  }, []);

  useEffect(() => {
    if (open) loadBusinesses();
  }, [open, loadBusinesses]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(
      (a) => a.label.toLowerCase().includes(q) || a.metaAdAccountId.toLowerCase().includes(q)
    );
  }, [accounts, query]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function close() {
    setOpen(false);
    reset();
  }

  function goToAccounts(bmId: string) {
    setSelectedBm(bmId);
    setSelected(new Set());
    setQuery("");
    setStep("accounts");
    loadAccounts(bmId);
  }

  function create() {
    setError(null);
    const bmName = businesses.find((b) => b.metaBusinessId === selectedBm)?.name;
    startTransition(async () => {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          metaBusinessId: selectedBm || undefined,
          metaBusinessName: bmName || undefined,
          metaAdAccountIds: [...selected]
        })
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) {
        setError(j?.error ?? tHub("createFailed"));
        return;
      }
      setOpen(false);
      reset();
      onCreated();
    });
  }

  const headerTitle =
    step === "accounts" ? t("chooseAccounts") : step === "bm" ? t("pickBm") : t("title");

  const headerSubtitle =
    step === "name"
      ? t("titleHint")
      : step === "bm"
        ? t("pickBmHint")
        : t("chooseAccountsHint");

  return (
    <>
      {controlledOpen === undefined ? (
        <button type="button" onClick={() => setOpen(true)} className="ui-btn-primary">
          {t("openButton")}
        </button>
      ) : null}

      <CreatorModalShell
        open={open}
        onClose={close}
        title={headerTitle}
        subtitle={headerSubtitle}
        titleIcon={<Users size={18} aria-hidden />}
        width="lg"
        cancelLabel={step === "name" ? t("cancel") : t("back")}
        onCancel={
          step === "name"
            ? close
            : step === "bm"
              ? () => setStep("name")
              : () => setStep("bm")
        }
        onPrimary={
          step === "name"
            ? () => setStep("bm")
            : step === "accounts"
              ? create
              : undefined
        }
        primaryLabel={step === "name" ? t("next") : step === "accounts" ? (isPending ? t("creating") : t("create")) : undefined}
        primaryDisabled={
          step === "name" ? !name.trim() : step === "accounts" ? isPending || selected.size === 0 : true
        }
        primaryLoading={step === "accounts" && isPending}
        showPrimaryCheck={step === "accounts"}
        contentClassName="space-y-4"
      >
        {step === "name" ? (
          <>
            {inventoryEmpty ? (
              <div className="campaign-creator-copy-card campaign-creator-copy-card--lead text-xs">
                <div className="campaign-creator-copy-card__content">
                  <span className="text-[var(--text-dim)]">
                    {t("emptyInventory")}{" "}
                    <Link href="/settings/meta-assets" className="font-medium text-[var(--ui-accent)] underline">
                      {t("goMetaAssets")}
                    </Link>
                  </span>
                </div>
              </div>
            ) : null}
            <section className="campaign-creator-card">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (name.trim()) setStep("bm");
                }}
              >
                <FilterTextField
                  creatorField
                  icon={<Tag size={13} />}
                  label={t("clientName")}
                  placeholder={tHub("newClientPlaceholder")}
                  value={name}
                  onChange={setName}
                />
              </form>
            </section>
          </>
        ) : null}

        {step === "bm" ? (
          <section className="campaign-creator-card">
            <div className="campaign-creator-sidebar-card-inset max-h-72 space-y-2 overflow-y-auto p-2">
              {businesses.length === 0 ? (
                <div className="py-8 text-center text-sm text-[var(--text-dim)]">
                  {t("noAvailableAccounts")}{" "}
                  <Link href="/settings/meta-assets" className="font-medium text-[var(--ui-accent)] underline">
                    {t("goMetaAssets")}
                  </Link>
                </div>
              ) : (
                businesses.map((bm) => (
                  <button
                    key={bm.metaBusinessId}
                    type="button"
                    onClick={() => goToAccounts(bm.metaBusinessId)}
                    className="campaign-creator-budget-choice-card campaign-creator-budget-choice-card--row campaign-creator-budget-choice-card--unselected w-full"
                  >
                    <ChoiceCardCheck selected={false} />
                    <span
                      className="campaign-creator-budget-choice-card__icon campaign-creator-budget-choice-card__icon--inline campaign-creator-budget-choice-card__icon--unselected"
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
                        {t("bmCounts", { accounts: bm.adAccountCount, pages: bm.pageCount })}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </section>
        ) : null}

        {step === "accounts" ? (
          <>
            <section className="campaign-creator-card space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full border border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)] px-2.5 py-0.5 font-heading text-[11px] font-semibold text-[var(--ui-accent)]">
                  {t("selectedCount", { count: selected.size })}
                </span>
                <span className="campaign-creator-orion-section-label">{t("spentLast30d")}</span>
              </div>

              <FilterTextField
                creatorField
                icon={<Search size={13} />}
                label={t("stepAccounts")}
                placeholder={t("searchAccounts")}
                value={query}
                onChange={setQuery}
              />

              <div className="campaign-creator-sidebar-card-inset max-h-72 overflow-y-auto">
                {loadingAccounts ? (
                  <div className="py-8 text-center text-sm text-[var(--text-dim)]">{t("loadingAccounts")}</div>
                ) : filtered.length === 0 ? (
                  <div className="py-8 text-center text-sm text-[var(--text-dim)]">
                    {t("noAvailableAccounts")}{" "}
                    <Link href="/settings/meta-assets" className="font-medium text-[var(--ui-accent)] underline">
                      {t("goMetaAssets")}
                    </Link>
                  </div>
                ) : (
                  <ul>
                    {filtered.map((acc) => {
                      const checked = selected.has(acc.metaAdAccountId);
                      return (
                        <li
                          key={acc.metaAdAccountId}
                          className="border-b border-[var(--creator-card-border,var(--border-color))] last:border-b-0"
                        >
                          <label
                            className={cn(
                              "flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors",
                              checked && "bg-[var(--ui-accent-muted)]"
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggle(acc.metaAdAccountId)}
                              className="h-4 w-4 rounded accent-[var(--ui-accent)]"
                            />
                            <span
                              className={cn(
                                "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                                checked
                                  ? "bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]"
                                  : "bg-[var(--creator-card-bg-inset,var(--surface-bg))] text-[var(--text-dim)]"
                              )}
                              aria-hidden
                            >
                              <CreditCard size={14} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium text-[var(--text-main)]">
                                {acc.label}
                              </div>
                              <div className="truncate text-xs text-[var(--text-dimmer)]">
                                ID: {acc.metaAdAccountId}
                              </div>
                            </div>
                            <div className="shrink-0 text-sm font-semibold text-[var(--text-dim)]">
                              {acc.spendLast30d != null ? formatBRL(acc.spendLast30d, locale) : "—"}
                            </div>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>

            {error ? <div className="ui-alert-danger px-3 py-2 text-xs">{error}</div> : null}
          </>
        ) : null}
      </CreatorModalShell>
    </>
  );
}
