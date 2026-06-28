"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Gauge, Sparkles, Target, Users } from "lucide-react";

type InsightsResult = {
  estimate: { estimateReady: boolean; usersLowerBound: number | null; usersUpperBound: number | null };
  segments: { total: number; invalid: { id: string; name: string }[] };
  demographics: {
    bestAge: string | null;
    personaRange: { min: number | null; max: number | null; gender: string };
  };
  ai: {
    coherenceScore: number;
    summary: string;
    recommendations: { title: string; body: string; severity: "high" | "medium" | "low" }[];
  } | null;
};

const SEV_COLOR: Record<string, string> = {
  high: "#ef4444",
  medium: "#f5a623",
  low: "#10b981"
};

/** Fase 1 — Insights & Comparação da persona com dados reais da Meta (read-only). */
export function PersonaInsightsPanel({
  targeting,
  ageMin,
  ageMax,
  gender,
  narrative,
  clientSlug,
  adAccountId
}: {
  targeting: Record<string, unknown>;
  ageMin?: number;
  ageMax?: number;
  gender?: string;
  narrative?: string;
  clientSlug?: string;
  adAccountId?: string;
}) {
  const t = useTranslations("audiences");
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<InsightsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/personas/insights")
      .then((r) => r.json())
      .then((j) => setEnabled(Boolean(j?.enabled)))
      .catch(() => setEnabled(false));
  }, []);

  if (!enabled) return null;

  const hasTargeting = Boolean(targeting && Object.keys(targeting).length > 0);
  const canAnalyze = Boolean(clientSlug && adAccountId && hasTargeting);

  async function analyze() {
    if (!canAnalyze) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch("/api/personas/insights", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientId: clientSlug,
          adAccountId,
          targeting,
          ageMin,
          ageMax,
          gender,
          narrative: narrative ?? undefined
        })
      });
      const j = await res.json();
      if (!j?.ok) {
        setError(t("piFailed"));
        return;
      }
      setData(j as InsightsResult);
    } catch {
      setError(t("piFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ui-card mt-4 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ background: "rgba(124,58,237,0.12)", color: "var(--violet-bright)" }}
          >
            <Sparkles size={15} />
          </span>
          <div>
            <h4 className="font-heading text-sm font-semibold text-[var(--text-main)]">{t("piTitle")}</h4>
            <p className="text-xs text-[var(--text-dim)]">{t("piSubtitle")}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={analyze}
          disabled={!canAnalyze || loading}
          className="ui-btn-primary shrink-0 text-xs disabled:opacity-60"
        >
          {loading ? t("piAnalyzing") : t("piAnalyze")}
        </button>
      </div>

      {!canAnalyze ? (
        <p className="text-xs text-[var(--text-dimmer)]">
          {!hasTargeting ? t("piNeedTargeting") : t("piNeedClient")}
        </p>
      ) : null}
      {error ? <p className="text-xs text-rose-500">{error}</p> : null}

      {data ? (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Stat
              icon={<Users size={13} />}
              label={t("piReach")}
              value={
                data.estimate.usersLowerBound != null
                  ? `${(data.estimate.usersLowerBound / 1000).toFixed(0)}k+`
                  : "—"
              }
            />
            <Stat
              icon={<Gauge size={13} />}
              label={t("piScore")}
              value={data.ai ? `${data.ai.coherenceScore}/100` : "—"}
            />
            <Stat
              icon={<Target size={13} />}
              label={t("piBestAge")}
              value={data.demographics.bestAge ?? "—"}
            />
          </div>

          {data.segments.invalid.length ? (
            <div className="rounded-lg border border-[rgba(245,166,35,0.35)] bg-[rgba(245,166,35,0.08)] p-2.5 text-xs text-[var(--amber-bright)]">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <AlertTriangle size={13} />
                {t("piInvalidSegments", { count: data.segments.invalid.length })}
              </span>
              <span className="ml-1 text-[var(--text-dim)]">
                {data.segments.invalid.map((s) => s.name).join(", ")}
              </span>
            </div>
          ) : null}

          {data.ai ? (
            <>
              <p className="text-xs leading-relaxed text-[var(--text-dim)]">{data.ai.summary}</p>
              <div className="space-y-1.5">
                {data.ai.recommendations.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 rounded-lg border border-[var(--border-color)] p-2.5"
                  >
                    <span
                      className="mt-1 h-2 w-2 shrink-0 rounded-full"
                      style={{ background: SEV_COLOR[r.severity] ?? "#94a3b8" }}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[var(--text-main)]">{r.title}</p>
                      <p className="text-xs text-[var(--text-dim)]">{r.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--border-color)] p-2.5">
      <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-[var(--text-dimmer)]">
        {icon}
        {label}
      </p>
      <p className="mt-0.5 text-sm font-bold text-[var(--text-main)]">{value}</p>
    </div>
  );
}
