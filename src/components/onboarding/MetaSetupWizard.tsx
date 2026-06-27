"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState, useTransition } from "react";

import { Link } from "@/i18n/navigation";
import { ChooseAdAccountsView } from "@/components/ChooseAdAccountsView";

type TermItem = {
  id: string;
  title: string;
  description: string;
  status: "accepted" | "not_accepted";
  url: string;
};

type ProbeResult = {
  account: string;
  label: string;
  ok: boolean;
};

const STEPS = ["connect", "accounts", "assets", "terms", "verify"] as const;
type Step = (typeof STEPS)[number];

export function MetaSetupWizard({
  locale,
  metaConnected
}: {
  locale: string;
  metaConnected?: boolean;
}) {
  const t = useTranslations("metaSetup");
  const [step, setStep] = useState<Step>(metaConnected ? "accounts" : "connect");
  const [terms, setTerms] = useState<TermItem[]>([]);
  const [probes, setProbes] = useState<ProbeResult[]>([]);
  const [discoverDone, setDiscoverDone] = useState(false);
  const [, startTransition] = useTransition();

  const stepIndex = STEPS.indexOf(step);

  const runDiscover = useCallback(() => {
    startTransition(async () => {
      const res = await fetch("/api/meta/discover", { method: "POST" });
      const j = await res.json();
      if (j.ok) setDiscoverDone(true);
    });
  }, []);

  const loadTerms = useCallback(() => {
    fetch("/api/meta/terms-status")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setTerms(j.terms ?? []);
      })
      .catch(() => {});
  }, []);

  const runProbes = useCallback(() => {
    fetch("/api/meta/probe-accounts")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          setProbes(
            (j.accounts ?? []).map(
              (a: { account: string; label: string; ok: boolean }) => ({
                account: a.account,
                label: a.label,
                ok: a.ok
              })
            )
          );
        }
      })
      .catch(() => setProbes([]));
  }, []);

  useEffect(() => {
    if (step === "terms") loadTerms();
    if (step === "verify") runProbes();
  }, [step, loadTerms, runProbes]);

  useEffect(() => {
    if (metaConnected && step === "connect") {
      runDiscover();
      setStep("accounts");
    }
  }, [metaConnected, step, runDiscover]);

  function dots() {
    return (
      <div className="mb-6 flex justify-center gap-2">
        {STEPS.map((s, i) => (
          <span
            key={s}
            className={`h-2 w-2 rounded-full ${
              i <= stepIndex ? "bg-[var(--ui-accent)]" : "bg-[var(--border-color)]"
            }`}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="ui-card p-6 sm:p-8">
        {dots()}
        <h1 className="font-heading text-xl font-bold text-[var(--text-main)]">{t(`steps.${step}.title`)}</h1>
        <p className="mt-2 text-sm text-[var(--text-dim)]">{t(`steps.${step}.subtitle`)}</p>

        {step === "connect" ? (
          <div className="mt-6 space-y-4">
            <ul className="space-y-2 text-sm text-[var(--text-dim)]">
              {(["perm1", "perm2", "perm3"] as const).map((k) => (
                <li key={k} className="flex gap-2">
                  <span className="text-[var(--violet)]">✓</span>
                  {t(k)}
                </li>
              ))}
            </ul>
            <a
              href={`/api/meta/oauth/start?redirectTo=${encodeURIComponent(`/${locale}/onboarding/meta/setup?metaConnected=1`)}`}
              className="inline-flex ui-btn-primary"
            >
              {t("connectButton")}
            </a>
          </div>
        ) : null}

        {step === "accounts" ? (
          <div className="mt-6">
            {!discoverDone ? (
              <button
                type="button"
                onClick={runDiscover}
                className="mb-4 text-sm ui-link"
              >
                {t("syncAssets")}
              </button>
            ) : null}
            <ChooseAdAccountsView />
          </div>
        ) : null}

        {step === "assets" ? (
          <div className="mt-6 space-y-4 text-sm text-[var(--text-dim)]">
            <p>{t("assetsHint")}</p>
            <Link
              href="/settings/meta-assets"
              className="inline-flex ui-btn-secondary"
            >
              {t("openAssetsHub")} →
            </Link>
          </div>
        ) : null}

        {step === "terms" ? (
          <div className="mt-6 space-y-3">
            {terms.map((term) => (
              <div
                key={term.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[var(--border-color)] p-4"
              >
                <div>
                  <div className="font-medium text-[var(--text-main)]">{term.title}</div>
                  <p className="mt-1 text-xs text-[var(--text-dim)]">{term.description}</p>
                  <span
                    className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      term.status === "accepted"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {term.status === "accepted" ? t("termAccepted") : t("termNotAccepted")}
                  </span>
                </div>
                {term.status !== "accepted" ? (
                  <a
                    href={term.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-[var(--border-color)] px-3 py-1.5 text-xs font-semibold text-[var(--text-dim)] hover:bg-[var(--surface-thead)]"
                  >
                    {t("openOnFacebook")} ↗
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {step === "verify" ? (
          <div className="mt-6 space-y-2">
            {probes.length === 0 ? (
              <p className="text-sm text-[var(--text-dim)]">{t("verifyLoading")}</p>
            ) : (
              probes.map((p) => (
                <div
                  key={p.account}
                  className="flex items-center justify-between rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm"
                >
                  <span>{p.label}</span>
                  <span
                    className={`text-xs font-semibold ${p.ok ? "text-emerald-600" : "text-amber-700"}`}
                  >
                    {p.ok ? t("verifyOk") : t("verifyFail")}
                  </span>
                </div>
              ))
            )}
          </div>
        ) : null}

        <div className="mt-8 flex items-center justify-between border-t border-[var(--border-color)] pt-4">
          {stepIndex > 0 ? (
            <button
              type="button"
              onClick={() => setStep(STEPS[stepIndex - 1])}
              className="text-sm font-medium text-[var(--text-dim)] hover:text-[var(--text-dim)]"
            >
              ← {t("back")}
            </button>
          ) : (
            <span />
          )}
          {step !== "verify" ? (
            <button
              type="button"
              onClick={() => setStep(STEPS[stepIndex + 1])}
              className="ui-btn-primary"
            >
              {t("continue")}
            </button>
          ) : (
            <Link
              href="/dashboard"
              className="ui-btn-primary"
            >
              {t("finish")}
            </Link>
          )}
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-[var(--text-dim)]">{t("manageLater")}</p>
    </div>
  );
}
