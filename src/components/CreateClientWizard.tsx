"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import { Link } from "@/i18n/navigation";
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

  // Carrega APENAS as contas da BM selecionada (não lista todas as contas).
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

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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

  return (
    <>
      {controlledOpen === undefined ? (
        <button type="button" onClick={() => setOpen(true)} className="ui-btn-primary">
          {t("openButton")}
        </button>
      ) : null}

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={close}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-[var(--surface-card)] shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-color)] px-5 py-4">
              <div className="text-base font-semibold text-[var(--text-main)]">{headerTitle}</div>
              <button
                type="button"
                onClick={close}
                className="rounded-lg p-1 text-[var(--text-dimmer)] hover:bg-[var(--surface-bg)] hover:text-[var(--text-dim)]"
                aria-label={t("cancel")}
              >
                ✕
              </button>
            </div>

            {/* Etapa 1: nome */}
            {step === "name" ? (
              <div className="space-y-3 px-5 py-5">
                {inventoryEmpty ? (
                  <div className="ui-alert-warning px-3 py-2 text-xs text-amber-900">
                    {t("emptyInventory")}{" "}
                    <Link
                      href="/settings/meta-assets"
                      className="font-medium text-[var(--violet)] underline"
                    >
                      {t("goMetaAssets")}
                    </Link>
                  </div>
                ) : null}
                <label className="block text-xs text-[var(--text-dim)]">{t("clientName")}</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="ui-input w-full"
                  placeholder={tHub("newClientPlaceholder")}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && name.trim()) setStep("bm");
                  }}
                />
                <button
                  type="button"
                  disabled={!name.trim()}
                  onClick={() => setStep("bm")}
                  className="ui-btn-primary w-full disabled:opacity-60"
                >
                  {t("next")}
                </button>
              </div>
            ) : null}

            {/* Etapa 2: escolher BM */}
            {step === "bm" ? (
              <div className="flex flex-1 flex-col overflow-hidden">
                <div className="flex-1 space-y-1 overflow-y-auto px-5 py-4">
                  {businesses.length === 0 ? (
                    <div className="py-8 text-center text-sm text-[var(--text-dim)]">
                      {t("noAvailableAccounts")}{" "}
                      <Link
                        href="/settings/meta-assets"
                        className="font-medium text-[var(--violet)] underline"
                      >
                        {t("goMetaAssets")}
                      </Link>
                    </div>
                  ) : (
                    businesses.map((bm) => (
                      <button
                        key={bm.metaBusinessId}
                        type="button"
                        onClick={() => goToAccounts(bm.metaBusinessId)}
                        className="flex w-full items-center justify-between gap-2 rounded-xl border border-[var(--border-color)] px-3 py-2.5 text-left hover:border-violet-300 hover:bg-[rgba(124,58,237,0.06)]/40"
                      >
                        <span className="text-sm font-medium text-[var(--text-main)]">{bm.name}</span>
                        <span className="text-xs text-[var(--text-dim)]">
                          {t("bmCounts", { accounts: bm.adAccountCount, pages: bm.pageCount })}
                        </span>
                      </button>
                    ))
                  )}
                </div>
                <div className="border-t border-[var(--border-color)] px-5 py-3">
                  <button type="button" onClick={() => setStep("name")} className="ui-btn-secondary">
                    {t("back")}
                  </button>
                </div>
              </div>
            ) : null}

            {/* Etapa 3: contas da BM selecionada (estilo Birch) */}
            {step === "accounts" ? (
              <>
                <div className="px-5 pt-4">
                  <p className="text-xs text-[var(--text-dim)]">{t("chooseAccountsHint")}</p>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t("searchAccounts")}
                    className="ui-input mt-3 w-full"
                  />
                  <div className="mt-2 flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-[var(--text-dimmer)]">
                    <span>{t("selectedCount", { count: selected.size })}</span>
                    <span>{t("spentLast30d")}</span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-5">
                  {loadingAccounts ? (
                    <div className="py-8 text-center text-sm text-[var(--text-dim)]">
                      {t("loadingAccounts")}
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="py-8 text-center text-sm text-[var(--text-dim)]">
                      {t("noAvailableAccounts")}{" "}
                      <Link
                        href="/settings/meta-assets"
                        className="font-medium text-[var(--violet)] underline"
                      >
                        {t("goMetaAssets")}
                      </Link>
                    </div>
                  ) : (
                    <ul className="divide-y divide-[var(--border-color)]">
                      {filtered.map((acc) => {
                        const checked = selected.has(acc.metaAdAccountId);
                        return (
                          <li key={acc.metaAdAccountId}>
                            <label className="flex cursor-pointer items-center gap-3 py-2.5 hover:bg-[var(--surface-bg)]/60">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggle(acc.metaAdAccountId)}
                                className="h-4 w-4 rounded border-[var(--border-color)] text-[var(--violet)] focus:ring-violet-500"
                              />
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

                {error ? (
                  <div className="mx-5 mt-2 ui-alert-danger px-3 py-2 text-xs text-rose-700">
                    {error}
                  </div>
                ) : null}

                <div className="flex items-center justify-between gap-2 border-t border-[var(--border-color)] px-5 py-3">
                  <button type="button" onClick={() => setStep("bm")} className="ui-btn-secondary">
                    {t("back")}
                  </button>
                  <button
                    type="button"
                    disabled={isPending || selected.size === 0}
                    onClick={create}
                    className="ui-btn-primary disabled:opacity-60"
                  >
                    {isPending ? t("creating") : t("create")}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
