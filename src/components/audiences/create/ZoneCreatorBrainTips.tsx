"use client";

import { useEffect, useState } from "react";
import { Brain, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";

import type { ZoneCreatorSectionKey } from "@/components/audiences/create/zone-creator-steps";

const TIP_KEYS: Record<ZoneCreatorSectionKey, string> = {
  brief: "zoneTipBrief",
  places: "zoneTipPlaces",
  review: "zoneTipReview"
};

type GeoResult = {
  itemsAnalyzed: number;
  summary: string | null;
  confidence: number | null;
  findings: { type: string; title: string; body: string }[];
  reach?: { lower: number | null; upper: number | null } | null;
};

function fmtReach(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

const TYPE_COLOR: Record<string, string> = {
  fit: "#10b981",
  misfit: "#ef4444",
  suggestion: "#f5a623",
  insight: "#38bdf8"
};

export function ZoneCreatorBrainTips({
  zoneSection,
  briefing,
  region,
  places,
  geoLocations
}: {
  zoneSection: ZoneCreatorSectionKey;
  briefing?: string;
  region?: string;
  places?: string[];
  geoLocations?: { label?: string; latitude: number; longitude: number; radius: number }[];
}) {
  const t = useTranslations("audiences");
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [geo, setGeo] = useState<GeoResult | null>(null);

  useEffect(() => {
    fetch("/api/zones/insights")
      .then((r) => r.json())
      .then((j) => setEnabled(Boolean(j?.enabled)))
      .catch(() => setEnabled(false));
  }, []);

  // Geo Scientist roda automaticamente quando há lugares gerados.
  const hasInput = Boolean((places && places.length) || (geoLocations && geoLocations.length));
  const signature =
    enabled && hasInput
      ? `${briefing ?? ""}|${(places ?? []).join(",")}|${(geoLocations ?? []).length}`
      : null;
  useEffect(() => {
    if (!signature) return;
    let active = true;
    const handle = setTimeout(() => {
      setLoading(true);
      fetch("/api/zones/insights", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ briefing, region, places, geoLocations })
      })
        .then((r) => r.json())
        .then((j) => {
          if (active && j?.ok) setGeo(j.geo as GeoResult);
        })
        .catch(() => {})
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 1200);
    return () => {
      active = false;
      clearTimeout(handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return (
    <div className="campaign-creator-sidebar-card">
      <p className="campaign-creator-orion-section-label mb-2 inline-flex items-center gap-1.5">
        <Brain size={12} className="text-[var(--ui-accent)]" aria-hidden />
        Orion Brain
      </p>
      <p className="text-xs leading-relaxed text-[var(--text-dim)]">{t(TIP_KEYS[zoneSection])}</p>

      {enabled && (geo || loading) ? (
        <div className="mt-3 overflow-hidden rounded-lg border border-[var(--creator-card-border,var(--border-color))]">
          <div className="flex items-center gap-2 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 px-3 py-2">
            <MapPin
              size={14}
              className={`text-white ${loading ? "animate-pulse" : ""}`}
              aria-hidden
            />
            <span className="text-[11px] font-semibold text-white">Geo Scientist</span>
            {loading ? (
              <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-medium text-white/90">
                <span className="h-1.5 w-1.5 animate-ping rounded-full bg-white" />
                Validando a região…
              </span>
            ) : null}
          </div>
          <div className="px-3 py-2.5">
            {loading && !geo ? (
              <p className="text-[11px] text-[var(--text-dim)]">Validando os locais com a IA…</p>
            ) : geo ? (
              <>
                {geo.confidence != null ? (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[var(--text-dim)]">Confiança</span>
                    <span className="text-xs font-semibold text-[var(--text-main)]">
                      {geo.confidence}/100
                    </span>
                  </div>
                ) : null}
                {geo.reach && (geo.reach.lower != null || geo.reach.upper != null) ? (
                  <div className="mt-0.5 flex items-center justify-between">
                    <span className="text-[11px] text-[var(--text-dim)]">Alcance estimado</span>
                    <span className="text-xs font-semibold text-[var(--text-main)]">
                      {fmtReach(geo.reach.lower)}–{fmtReach(geo.reach.upper)}
                    </span>
                  </div>
                ) : null}
                {geo.summary ? (
                  <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--text-main)]">
                    {geo.summary}
                  </p>
                ) : null}
                {geo.findings.slice(0, 4).map((f, i) => (
                  <p
                    key={i}
                    className="mt-1 flex items-start gap-1.5 text-[11px] leading-snug text-[var(--text-dim)]"
                  >
                    <span
                      className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: TYPE_COLOR[f.type] ?? "#94a3b8" }}
                    />
                    {f.title}
                  </p>
                ))}
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
