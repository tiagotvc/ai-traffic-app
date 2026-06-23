"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";

import { useRouter } from "@/i18n/navigation";
import { usePublishAssets } from "@/hooks/usePublishAssets";

type StepId = "context" | "strategy" | "audience" | "creative" | "draft";

const STEPS: StepId[] = ["context", "strategy", "audience", "creative", "draft"];

type ClientOption = { id: string; slug: string; name: string };

type Props = {
  initialClientSlug?: string;
};

export function AiCampaignGeneratorClient({ initialClientSlug }: Props) {
  const t = useTranslations("campaignCreator.ai");
  const locale = useLocale();
  const router = useRouter();

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientSlug, setClientSlug] = useState(initialClientSlug ?? "");
  const [prompt, setPrompt] = useState("");
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);

  const { accounts, accountsLoading, defaultAdAccountId } = usePublishAssets(clientSlug, "");
  const [adAccountId, setAdAccountId] = useState("");

  useEffect(() => {
    fetch("/api/clients?minimal=1")
      .then((r) => r.json())
      .then((j: { clients?: ClientOption[] }) => setClients(j.clients ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (defaultAdAccountId && !adAccountId) setAdAccountId(defaultAdAccountId);
  }, [defaultAdAccountId, adAccountId]);

  const canGenerate = Boolean(clientSlug && adAccountId && !generating);

  const stepLabels = useMemo(
    () =>
      STEPS.map((s) => ({
        id: s,
        label: t(`step_${s}`)
      })),
    [t]
  );

  const runGeneration = useCallback(async () => {
    if (!clientSlug || !adAccountId) return;
    setGenerating(true);
    setError(null);
    setDone(false);
    setActiveStep(0);

    const stepTimer = window.setInterval(() => {
      setActiveStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    }, 4500);

    try {
      const res = await fetch("/api/campaign-creator/ai-generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientId: clientSlug,
          adAccountId,
          locale,
          prompt: prompt.trim() || undefined
        })
      });
      const j = (await res.json()) as {
        ok?: boolean;
        draftId?: string;
        error?: string;
        message?: string;
      };

      if (!j.ok || !j.draftId) {
        throw new Error(j.message ?? j.error ?? t("generateFailed"));
      }

      setActiveStep(STEPS.length - 1);
      setDone(true);
      window.setTimeout(() => {
        router.replace(`/campaigns/new/${j.draftId}?review=1`);
      }, 800);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("generateFailed"));
    } finally {
      window.clearInterval(stepTimer);
      setGenerating(false);
    }
  }, [adAccountId, clientSlug, locale, prompt, router, t]);

  const autoStartedRef = useRef(false);

  useEffect(() => {
    if (
      initialClientSlug &&
      defaultAdAccountId &&
      adAccountId &&
      !generating &&
      !done &&
      !error &&
      !autoStartedRef.current
    ) {
      autoStartedRef.current = true;
      void runGeneration();
    }
  }, [initialClientSlug, defaultAdAccountId, adAccountId, generating, done, error, runGeneration]);

  return (
    <div className="mx-auto max-w-xl space-y-6 p-6">
      <div className="text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <Sparkles size={22} />
        </span>
        <h1 className="mt-3 font-heading text-xl font-semibold text-[var(--text-main)]">
          {t("generatorTitle")}
        </h1>
        <p className="mt-1 text-sm text-[var(--text-dim)]">{t("generatorHint")}</p>
      </div>

      {!initialClientSlug || !defaultAdAccountId ? (
        <div className="ui-card space-y-3 p-4">
          <div>
            <label className="text-xs text-[var(--text-dim)]">{t("selectClient")}</label>
            <select
              value={clientSlug}
              onChange={(e) => {
                setClientSlug(e.target.value);
                setAdAccountId("");
              }}
              className="ui-select mt-1 w-full"
            >
              <option value="">{t("selectClientPlaceholder")}</option>
              {clients.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--text-dim)]">{t("selectAdAccount")}</label>
            <select
              value={adAccountId}
              onChange={(e) => setAdAccountId(e.target.value)}
              disabled={!clientSlug || accountsLoading}
              className="ui-select mt-1 w-full"
            >
              <option value="">{t("selectAdAccountPlaceholder")}</option>
              {accounts.map((a) => (
                <option key={a.metaAdAccountId} value={a.metaAdAccountId}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--text-dim)]">{t("optionalPrompt")}</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder={t("optionalPromptPlaceholder")}
              className="ui-input mt-1 w-full resize-none text-sm"
            />
          </div>
          <button
            type="button"
            className="ui-btn-primary w-full"
            disabled={!canGenerate}
            onClick={() => void runGeneration()}
          >
            {t("startGenerate")}
          </button>
        </div>
      ) : null}

      <div className="ui-card p-4">
        <ul className="space-y-3">
          {stepLabels.map((step, i) => {
            const isActive = generating && i === activeStep;
            const isComplete = done || i < activeStep;
            return (
              <li key={step.id} className="flex items-center gap-3 text-sm">
                {isComplete && !isActive ? (
                  <CheckCircle2 size={18} className="shrink-0 text-[var(--success)]" />
                ) : isActive ? (
                  <Loader2 size={18} className="shrink-0 animate-spin text-amber-600" />
                ) : (
                  <span className="inline-flex h-[18px] w-[18px] shrink-0 rounded-full border border-[var(--border-color)]" />
                )}
                <span
                  className={
                    isActive || isComplete
                      ? "font-medium text-[var(--text-main)]"
                      : "text-[var(--text-dim)]"
                  }
                >
                  {step.label}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {error ? (
        <div className="ui-alert-warning">
          <p>{error}</p>
          <button
            type="button"
            className="ui-btn-secondary mt-2 text-xs"
            onClick={() => void runGeneration()}
            disabled={!canGenerate}
          >
            {t("retry")}
          </button>
        </div>
      ) : null}

      {done ? (
        <p className="text-center text-sm text-[var(--success)]">{t("redirecting")}</p>
      ) : generating ? (
        <p className="text-center text-xs text-[var(--text-dim)]">{t("pleaseWait")}</p>
      ) : null}
    </div>
  );
}
