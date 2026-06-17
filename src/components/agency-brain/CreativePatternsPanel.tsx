"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { Link } from "@/i18n/navigation";
import type { CreativePatternRow } from "@/lib/agency-brain/creative-patterns-service";

type CreativeLite = {
  key: string;
  name: string;
  thumbnailUrl?: string | null;
  metrics?: { spend?: number; ctr?: number; roas?: number; frequency?: number };
  campaigns?: Array<{ id: string; name: string }>;
};

function classifyClient(creatives: CreativeLite[]): CreativePatternRow[] {
  const rows: CreativePatternRow[] = [];
  for (const c of creatives) {
    const spend = Number(c.metrics?.spend ?? 0);
    const ctr = Number(c.metrics?.ctr ?? 0);
    const roas = Number(c.metrics?.roas ?? 0);
    const frequency = Number(c.metrics?.frequency ?? 0);
    if (spend < 30) continue;

    let tier: CreativePatternRow["tier"] | null = null;
    if (frequency >= 3.5 && ctr < 1 && spend >= 100) tier = "fatigue";
    else if (roas >= 2 || ctr >= 1.5) tier = "winner";
    else if (spend >= 150 && roas < 1 && ctr < 0.8) tier = "underperformer";
    if (!tier) continue;

    rows.push({
      key: c.key,
      name: c.name,
      spend,
      ctr,
      roas,
      frequency,
      tier,
      thumbnailUrl: c.thumbnailUrl ?? null
    });
  }
  return rows.sort((a, b) => b.spend - a.spend).slice(0, 20);
}

const TIER_STYLES: Record<CreativePatternRow["tier"], string> = {
  winner: "border-emerald-200 bg-emerald-50/80",
  fatigue: "border-amber-200 bg-amber-50/80",
  underperformer: "border-rose-200 bg-rose-50/80"
};

export function CreativePatternsPanel({ clientId }: { clientId: string }) {
  const t = useTranslations("creativePatterns");
  const [rows, setRows] = useState<CreativePatternRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CreativePatternRow["tier"] | "all">("all");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/creatives/performance?clientId=${encodeURIComponent(clientId)}&days=30`)
      .then((r) => r.json())
      .then((j) => setRows(classifyClient(j.creatives ?? [])))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [clientId]);

  const filtered = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.tier === filter)),
    [rows, filter]
  );

  const counts = useMemo(
    () => ({
      winner: rows.filter((r) => r.tier === "winner").length,
      fatigue: rows.filter((r) => r.tier === "fatigue").length,
      underperformer: rows.filter((r) => r.tier === "underperformer").length
    }),
    [rows]
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{t("title")}</h2>
          <p className="text-xs text-slate-500">{t("subtitle")}</p>
        </div>
        <Link href="/creatives" className="text-xs font-medium text-violet-600 hover:underline">
          {t("openLibrary")}
        </Link>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-px">
        {(["all", "winner", "fatigue", "underperformer"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`-mb-px border-b-2 px-3 pb-2 text-xs font-medium transition ${
              filter === key
                ? "border-slate-700 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t(`filter.${key}`)}
            {key !== "all" ? ` (${counts[key]})` : ""}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-sm text-slate-500">{t("loading")}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
          {t("empty")}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {filtered.map((row) => (
            <div
              key={row.key}
              className={`flex gap-3 rounded-xl border p-3 ${TIER_STYLES[row.tier]}`}
            >
              {row.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={row.thumbnailUrl}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-white/60 text-lg">
                  🎨
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-slate-900">{row.name}</div>
                <div className="mt-1 text-[11px] text-slate-600">
                  {t("metrics", {
                    spend: row.spend.toFixed(0),
                    ctr: row.ctr.toFixed(2),
                    roas: row.roas.toFixed(2),
                    freq: row.frequency.toFixed(1)
                  })}
                </div>
                <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  {t(`tier.${row.tier}`)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
