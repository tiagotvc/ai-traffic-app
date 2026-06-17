"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState, useTransition } from "react";

import { Link } from "@/i18n/navigation";

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
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-medium text-slate-500">{t("breadcrumb")}</p>
          <h1 className="mt-0.5 text-lg font-bold text-slate-900 sm:text-xl">{t("title")}</h1>
          <p className="mt-0.5 text-xs text-slate-500">{t("subtitle")}</p>
          <p className="mt-1.5 text-[11px] text-violet-800">{t("discoverFixHint")}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            disabled={isPending}
            onClick={refresh}
            className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-60"
          >
            {isPending ? t("refreshing") : t("refresh")}
          </button>
          {reconnectSlot}
        </div>
      </div>

      {message ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {message}
        </div>
      ) : null}

      <div className="ui-card p-4">
        <div className="text-sm font-semibold">{t("totalsTitle")}</div>
        <p className="mt-1 text-xs text-slate-500">
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
          <p className="mt-1 text-[10px] text-slate-500">{t("bmFilterHint")}</p>
          <input
            type="search"
            value={bmSearch}
            onChange={(e) => setBmSearch(e.target.value)}
            placeholder={t("bmSearchPlaceholder")}
            className="mt-2 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
          />
          <div className="mt-3 max-h-[420px] space-y-1 overflow-y-auto">
            <button
              type="button"
              onClick={() => setSelectedBm("")}
              className={`w-full rounded-lg px-3 py-2 text-left text-xs ${
                selectedBm === "" ? "bg-violet-50 text-violet-800" : "hover:bg-slate-50"
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
                    ? "bg-violet-50 text-violet-800"
                    : "hover:bg-slate-50"
                }`}
              >
                <div className="font-medium">{bm.name}</div>
                <div className="text-[10px] text-slate-500">
                  {bm.adAccountCount} · {bm.pageCount}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3 lg:col-span-2">
          <div className="ui-card p-4">
            <div className="text-sm font-semibold">{t("accountsTitle")}</div>
            <ul className="mt-2 space-y-1 text-xs text-slate-600">
              {accounts.length ? (
                accounts.map((a) => (
                  <li key={a.metaAdAccountId} className="flex justify-between gap-2 border-b border-slate-100 py-2">
                    <span>{a.label}</span>
                    <span className="shrink-0 font-mono text-[10px] text-slate-400">
                      {a.metaAdAccountId}
                    </span>
                  </li>
                ))
              ) : (
                <li className="py-2 text-slate-500">{t("emptyAccounts")}</li>
              )}
            </ul>
          </div>

          <div className="ui-card p-4">
            <div className="text-sm font-semibold">{t("pagesTitle")}</div>
            <ul className="mt-2 space-y-1 text-xs text-slate-600">
              {pages.length ? (
                pages.map((p) => (
                  <li key={p.metaPageId} className="flex justify-between gap-2 border-b border-slate-100 py-2">
                    <span>{p.name}</span>
                    <span className="shrink-0 font-mono text-[10px] text-slate-400">{p.metaPageId}</span>
                  </li>
                ))
              ) : (
                <li className="py-2 text-slate-500">{t("emptyPages")}</li>
              )}
            </ul>
          </div>

          <Link
            href="/clients"
            className="inline-block text-xs font-medium text-violet-600 underline"
          >
            {t("linkClients")}
          </Link>
        </div>
      </div>
    </div>
  );
}
