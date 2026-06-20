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
        <h1 className="font-heading text-xl font-bold text-[var(--text-main)]">{t("title")}</h1>
        <p className="mt-2 text-sm text-[var(--text-dim)]">{t("subtitle")}</p>

        {phase === "discovering" ? (
          <div className="mt-6 flex items-center gap-3 text-sm text-[var(--text-dim)]">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[var(--amber-bright)] border-t-transparent" />
            {t("discovering")}
          </div>
        ) : null}

        {phase === "error" ? (
          <div className="mt-6 space-y-3">
            <div className="ui-alert-danger">{error}</div>
            <button type="button" onClick={runDiscover} className="ui-btn-primary">
              {t("retry")}
            </button>
            <p className="text-xs text-[var(--text-dimmer)]">
              <Link href="/settings" className="ui-link underline">
                {t("settingsLink")}
              </Link>
            </p>
          </div>
        ) : null}

        {phase === "done" && result ? (
          <div className="mt-6 space-y-4">
            <div className="ui-alert-success">{t("summary", {
                businesses: result.businesses,
                accounts: result.adAccounts,
                pages: result.pages
              })}</div>

            {result.businessRows.length > 0 ? (
              <div className="space-y-2">
                {result.businessRows.map((bm) => (
                  <div key={bm.metaBusinessId} className="ui-card overflow-hidden">
                    <button
                      type="button"
                      onClick={() =>
                        setExpanded((e) => (e === bm.metaBusinessId ? null : bm.metaBusinessId))
                      }
                      className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-[var(--text-main)]"
                    >
                      <span>{bm.name}</span>
                      <span className="text-xs font-normal text-[var(--text-dimmer)]">
                        {t("bmCounts", {
                          accounts: bm.adAccountCount,
                          pages: bm.pageCount
                        })}
                      </span>
                    </button>
                    {expanded === bm.metaBusinessId ? (
                      <div className="border-t border-[var(--border-color)] px-4 py-2 text-xs text-[var(--text-dimmer)]">
                        ID: {bm.metaBusinessId}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2 pt-2">
              <Link href="/clients" className="ui-btn-primary">
                {t("ctaClients")}
              </Link>
              <Link href="/settings/meta-assets" className="ui-btn-secondary">
                {t("ctaAssets")}
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
