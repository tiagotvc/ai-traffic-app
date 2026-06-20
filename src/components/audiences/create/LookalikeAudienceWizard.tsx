"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/Badge";
import type { AudienceCreateContext } from "./types";

const COUNTRIES = ["BR", "US", "PT", "MX", "AR", "CO", "CL", "PE", "ES"] as const;
const RATIOS = [0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.1] as const;

type Props = {
  ctx: AudienceCreateContext;
  onBack: () => void;
};

export function LookalikeAudienceWizard({ ctx, onBack }: Props) {
  const t = useTranslations("audiences");
  const [pending, startTransition] = useTransition();
  const [country, setCountry] = useState<(typeof COUNTRIES)[number]>("BR");
  const [selectedRatios, setSelectedRatios] = useState<number[]>([0.01]);
  const [selectedSeeds, setSelectedSeeds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  const seeds = useMemo(
    () =>
      ctx.audiences.filter((a) => !(a.subtype ?? "").toUpperCase().includes("LOOKALIKE")),
    [ctx.audiences]
  );

  const toggleSeed = (id: string) => {
    setSelectedSeeds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setSelectAll(false);
  };

  const toggleRatio = (r: number) => {
    setSelectedRatios((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r].sort((a, b) => a - b)
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedSeeds([]);
      setSelectAll(false);
    } else {
      setSelectedSeeds(seeds.map((s) => s.id));
      setSelectAll(true);
    }
  };

  const totalJobs = selectedSeeds.length * selectedRatios.length;

  const submit = () => {
    if (!selectedSeeds.length || !selectedRatios.length) {
      ctx.onError(t("lookalikeSelectRequired"));
      return;
    }
    const items = selectedSeeds.flatMap((seedId) => {
      const seed = seeds.find((s) => s.id === seedId);
      return selectedRatios.map((ratio) => ({
        originAudienceId: seedId,
        ratio,
        country,
        name: `LA ${Math.round(ratio * 100)}% — ${seed?.name ?? seedId} — ${country}`
      }));
    });

    startTransition(async () => {
      const res = await fetch(`/api/clients/${encodeURIComponent(ctx.clientSlug)}/lookalike/batch`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ adAccountId: ctx.adAccountId, items })
      });
      const j = await res.json();
      if (j.ok || j.summary?.succeeded > 0) {
        ctx.onSuccess(t("lookalikeBatchSuccess", { count: j.summary?.succeeded ?? items.length }));
        ctx.onRefresh();
        onBack();
      } else {
        ctx.onError(j.error ?? t("createdFailed"));
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-[var(--text-main)]">{t("createType.lookalike.title")}</h2>
        <button type="button" onClick={onBack} className="ui-btn-secondary text-sm">
          {t("back")}
        </button>
      </div>

      <p className="text-xs text-[var(--text-dim)]">{t("lookalikeMinNote")}</p>

      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-[var(--text-dim)]">{t("seedAudience")}</label>
          <button type="button" onClick={handleSelectAll} className="text-xs text-[var(--violet)] underline">
            {selectAll ? t("deselectAll") : t("selectAllSeeds")}
          </button>
        </div>
        <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-xl border border-[var(--border-color)] p-2">
          {seeds.length === 0 ? (
            <p className="text-xs text-[var(--text-dim)]">{t("noSeeds")}</p>
          ) : (
            seeds.map((s) => (
              <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--surface-bg)]">
                <input
                  type="checkbox"
                  checked={selectedSeeds.includes(s.id)}
                  onChange={() => toggleSeed(s.id)}
                />
                <span className="min-w-0 flex-1 truncate text-sm">{s.name}</span>
                {s.subtype ? <Badge variant="neutral">{s.subtype}</Badge> : null}
              </label>
            ))
          )}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-[var(--text-dim)]">{t("stepCountry")}</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {COUNTRIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCountry(c)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${
                country === c ? "border-violet-500 bg-[rgba(124,58,237,0.06)] text-[var(--violet)]" : "border-[var(--border-color)]"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-[var(--text-dim)]">{t("lookalikeRatioSlider")}</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {RATIOS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => toggleRatio(r)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${
                selectedRatios.includes(r)
                  ? "border-violet-500 bg-[rgba(124,58,237,0.06)] text-[var(--violet)]"
                  : "border-[var(--border-color)]"
              }`}
            >
              {Math.round(r * 100)}%
            </button>
          ))}
        </div>
      </div>

      {totalJobs > 0 ? (
        <p className="text-sm text-[var(--text-dim)]">{t("lookalikeBatchPreview", { count: totalJobs })}</p>
      ) : null}

      <div className="flex justify-end">
        <button
          type="button"
          disabled={pending || !selectedSeeds.length || !selectedRatios.length}
          onClick={submit}
          className="ui-btn-primary"
        >
          {pending ? t("creating") : t("createLookalikeBatch")}
        </button>
      </div>
    </div>
  );
}
