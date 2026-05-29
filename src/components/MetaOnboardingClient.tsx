"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState, useTransition } from "react";

import { Link } from "@/i18n/navigation";

type BusinessRow = {
  metaBusinessId: string;
  name: string;
  adAccountCount: number;
  pageCount: number;
};

type DiscoverResult = {
  businesses: number;
  adAccounts: number;
  pages: number;
  businessRows: BusinessRow[];
};

export function MetaOnboardingClient() {
  const t = useTranslations("metaOnboarding");
  const [phase, setPhase] = useState<"discovering" | "done" | "error">("discovering");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DiscoverResult | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const runDiscover = useCallback(() => {
    setPhase("discovering");
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/meta/discover", { method: "POST" });
      const j = await res.json();
      if (!res.ok || !j.ok) {
        setPhase("error");
        setError(j.error ?? t("discoverFailed"));
        return;
      }
      setResult({
        businesses: j.businesses,
        adAccounts: j.adAccounts,
        pages: j.pages,
        businessRows: j.businessRows ?? []
      });
      setPhase("done");
    });
  }, [t]);

  useEffect(() => {
    runDiscover();
  }, [runDiscover]);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="ui-card p-6">
        <h1 className="text-xl font-bold text-slate-900">{t("title")}</h1>
        <p className="mt-2 text-sm text-slate-600">{t("subtitle")}</p>

        {phase === "discovering" ? (
          <div className="mt-6 flex items-center gap-3 text-sm text-slate-600">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
            {t("discovering")}
          </div>
        ) : null}

        {phase === "error" ? (
          <div className="mt-6 space-y-3">
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
            <button
              type="button"
              onClick={runDiscover}
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
            >
              {t("retry")}
            </button>
            <p className="text-xs text-slate-500">
              <Link href="/settings" className="text-violet-600 underline">
                {t("settingsLink")}
              </Link>
            </p>
          </div>
        ) : null}

        {phase === "done" && result ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              {t("summary", {
                businesses: result.businesses,
                accounts: result.adAccounts,
                pages: result.pages
              })}
            </div>

            {result.businessRows.length > 0 ? (
              <div className="space-y-2">
                {result.businessRows.map((bm) => (
                  <div key={bm.metaBusinessId} className="rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() =>
                        setExpanded((e) => (e === bm.metaBusinessId ? null : bm.metaBusinessId))
                      }
                      className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-slate-800"
                    >
                      <span>{bm.name}</span>
                      <span className="text-xs font-normal text-slate-500">
                        {t("bmCounts", {
                          accounts: bm.adAccountCount,
                          pages: bm.pageCount
                        })}
                      </span>
                    </button>
                    {expanded === bm.metaBusinessId ? (
                      <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
                        ID: {bm.metaBusinessId}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2 pt-2">
              <Link
                href="/clients"
                className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
              >
                {t("ctaClients")}
              </Link>
              <Link
                href="/settings/meta-assets"
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {t("ctaAssets")}
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
