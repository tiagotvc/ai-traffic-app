"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState, useTransition } from "react";

import { Link } from "@/i18n/navigation";
import { DsPageHeader } from "@/design-system";

type BusinessRow = {
  metaBusinessId: string;
  name: string;
  lastSyncedAt: string | null;
  adAccountCount: number;
  pageCount: number;
};

type AssetAccount = {
  metaAdAccountId: string;
  label: string;
  metaBusinessId?: string | null;
  isDemo?: boolean;
};

type AssetPage = {
  metaPageId: string;
  name: string;
};

export function MetaAssetsHubClient({
  locale: _locale,
  reconnectSlot
}: {
  locale: string;
  reconnectSlot?: ReactNode;
}) {
  const t = useTranslations("metaAssets");
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [totals, setTotals] = useState({ businesses: 0, adAccounts: 0, pages: 0 });
  const [selectedBm, setSelectedBm] = useState<string>("");
  const [bmSearch, setBmSearch] = useState("");
  const [accounts, setAccounts] = useState<AssetAccount[]>([]);
  const [pages, setPages] = useState<AssetPage[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadBusinesses = useCallback(() => {
    fetch("/api/meta/businesses")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          setBusinesses(j.businesses ?? []);
          setTotals(j.totals ?? { businesses: 0, adAccounts: 0, pages: 0 });
        }
      });
  }, []);

  const loadAssets = useCallback((businessId: string) => {
    const q = businessId ? `?businessId=${encodeURIComponent(businessId)}` : "";
    fetch(`/api/meta/assets${q}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          setAccounts(j.adAccounts ?? []);
          setPages(
            (j.pages ?? []).map((p: { metaPageId: string; name: string }) => ({
              metaPageId: p.metaPageId,
              name: p.name
            }))
          );
        }
      });
  }, []);

  useEffect(() => {
    loadBusinesses();
    loadAssets("");
  }, [loadBusinesses, loadAssets]);

  useEffect(() => {
    loadAssets(selectedBm);
  }, [selectedBm, loadAssets]);

  const filteredBusinesses = businesses.filter((bm) => {
    if (!bmSearch.trim()) return true;
    const needle = bmSearch.trim().toLowerCase();
    return (
      bm.name.toLowerCase().includes(needle) ||
      bm.metaBusinessId.toLowerCase().includes(needle)
    );
  });

  const refresh = () => {
    setMessage(null);
    startTransition(async () => {
      const res = await fetch("/api/meta/discover", { method: "POST" });
      const j = await res.json();
      if (!res.ok || !j.ok) {
        setMessage(j.error ?? t("refreshFailed"));
        return;
      }
      setMessage(
        t("refreshOk", {
          businesses: j.businesses,
          accounts: j.adAccounts,
          pages: j.pages
        })
      );
      loadBusinesses();
      loadAssets(selectedBm);
    });
  };

  return (
    <div className="space-y-4">
      <DsPageHeader
        breadcrumbs={t("breadcrumb")}
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <>
            <button
              type="button"
              disabled={isPending}
              onClick={refresh}
              className="ui-btn-primary text-xs disabled:opacity-60"
            >
              {isPending ? t("refreshing") : t("refresh")}
            </button>
            {reconnectSlot}
          </>
        }
      />
      <p className="-mt-3 text-[11px] text-[var(--violet)]">{t("discoverFixHint")}</p>

      {message ? (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-bg)] px-4 py-3 text-sm text-[var(--text-dim)]">
          {message}
        </div>
      ) : null}

      <div className="ui-card p-4">
        <div className="text-sm font-semibold">{t("totalsTitle")}</div>
        <p className="mt-1 text-xs text-[var(--text-dim)]">
          {t("totals", {
            businesses: totals.businesses,
            accounts: totals.adAccounts,
            pages: totals.pages
          })}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="ui-card p-4 lg:col-span-1">
          <div className="text-sm font-semibold">{t("bmList")}</div>
          <p className="mt-1 text-[10px] text-[var(--text-dim)]">{t("bmFilterHint")}</p>
          <input
            type="search"
            value={bmSearch}
            onChange={(e) => setBmSearch(e.target.value)}
            placeholder={t("bmSearchPlaceholder")}
            className="mt-2 w-full rounded-lg border border-[var(--border-color)] px-2 py-1.5 text-xs"
          />
          <div className="mt-3 max-h-[420px] space-y-1 overflow-y-auto">
            <button
              type="button"
              onClick={() => setSelectedBm("")}
              className={`w-full rounded-lg px-3 py-2 text-left text-xs ${
                selectedBm === "" ? "bg-[rgba(124,58,237,0.06)] text-[var(--violet)]" : "hover:bg-[var(--surface-bg)]"
              }`}
            >
              {t("allBm")}
            </button>
            {filteredBusinesses.map((bm) => (
              <button
                key={bm.metaBusinessId}
                type="button"
                onClick={() => setSelectedBm(bm.metaBusinessId)}
                className={`w-full rounded-lg px-3 py-2 text-left text-xs ${
                  selectedBm === bm.metaBusinessId
                    ? "bg-[rgba(124,58,237,0.06)] text-[var(--violet)]"
                    : "hover:bg-[var(--surface-bg)]"
                }`}
              >
                <div className="font-medium">{bm.name}</div>
                <div className="text-[10px] text-[var(--text-dim)]">
                  {bm.adAccountCount} · {bm.pageCount}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3 lg:col-span-2">
          <div className="ui-card p-4">
            <div className="text-sm font-semibold">{t("accountsTitle")}</div>
            <ul className="mt-2 space-y-1 text-xs text-[var(--text-dim)]">
              {accounts.length ? (
                accounts.map((a) => (
                  <li key={a.metaAdAccountId} className="flex justify-between gap-2 border-b border-[var(--border-color)] py-2">
                    <span>{a.label}</span>
                    <span className="shrink-0 font-mono text-[10px] text-[var(--text-dimmer)]">
                      {a.metaAdAccountId}
                    </span>
                  </li>
                ))
              ) : (
                <li className="py-2 text-[var(--text-dim)]">{t("emptyAccounts")}</li>
              )}
            </ul>
          </div>

          <div className="ui-card p-4">
            <div className="text-sm font-semibold">{t("pagesTitle")}</div>
            <ul className="mt-2 space-y-1 text-xs text-[var(--text-dim)]">
              {pages.length ? (
                pages.map((p) => (
                  <li key={p.metaPageId} className="flex justify-between gap-2 border-b border-[var(--border-color)] py-2">
                    <span>{p.name}</span>
                    <span className="shrink-0 font-mono text-[10px] text-[var(--text-dimmer)]">{p.metaPageId}</span>
                  </li>
                ))
              ) : (
                <li className="py-2 text-[var(--text-dim)]">{t("emptyPages")}</li>
              )}
            </ul>
          </div>

          <Link
            href="/clients"
            className="inline-block text-xs font-medium text-[var(--violet)] underline"
          >
            {t("linkClients")}
          </Link>
        </div>
      </div>
    </div>
  );
}
