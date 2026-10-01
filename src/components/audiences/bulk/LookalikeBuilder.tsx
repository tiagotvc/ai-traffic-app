"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";

import { FilterSearchInput } from "@/components/FilterSearchInput";
import { DsSectionHeader, DsSelectablePills } from "@/design-system";
import { planLookalikeAudiences } from "@/lib/audiences/bulk/builders";
import { LOOKALIKE_PRESETS, matchLookalikePresetSeeds } from "@/lib/audiences/bulk/presets";
import {
  BULK_LOOKALIKE_COUNTRIES,
  BULK_LOOKALIKE_RATIOS,
  type BulkLookalikeCountry,
  type BulkLookalikeRatio,
  type LookalikeConfig
} from "@/lib/audiences/bulk/types";
import { cn } from "@/lib/cn";

import { PresetSelect } from "./PresetSelect";
import type { BulkBuilderProps } from "./types";

const CUSTOM_PRESET = "custom";
const DEFAULT_RATIOS: BulkLookalikeRatio[] = [1, 2, 3];

type Seed = { id: string; name: string; approximateCount?: number };

export function LookalikeBuilder({ clientSlug, adAccountId, disabled, onChange }: BulkBuilderProps) {
  const t = useTranslations("audiencesBulk");
  const [seeds, setSeeds] = useState<Seed[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState<BulkLookalikeCountry>("BR");
  const [presetId, setPresetId] = useState(CUSTOM_PRESET);
  /** Percentuais aplicados a cada público-base marcado a partir de agora. */
  const [defaultRatios, setDefaultRatios] = useState<BulkLookalikeRatio[]>(DEFAULT_RATIOS);
  /** id do público-base → percentuais escolhidos. */
  const [selected, setSelected] = useState<Map<string, BulkLookalikeRatio[]>>(new Map());

  const load = useCallback(
    async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const qs = new URLSearchParams({ clientId: clientSlug, adAccountId });
        const j = (await fetch(`/api/audiences/bulk/seeds?${qs}`).then((r) => r.json())) as {
          ok: boolean;
          audiences?: Seed[];
          error?: string;
        };
        if (!j.ok) {
          setLoadError(j.error ?? t("loadError"));
          return;
        }
        const list = j.audiences ?? [];
        setSeeds(list);
        // Público-base que sumiu da conta não pode continuar marcado.
        setSelected((prev) => {
          const ids = new Set(list.map((s) => s.id));
          return new Map([...prev].filter(([id]) => ids.has(id)));
        });
      } catch {
        setLoadError(t("loadError"));
      } finally {
        setLoading(false);
      }
    },
    [clientSlug, adAccountId, t]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const visibleSeeds = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? seeds.filter((s) => s.name.toLowerCase().includes(q)) : seeds;
  }, [seeds, search]);

  const seedNames = useMemo(() => new Map(seeds.map((s) => [s.id, s.name])), [seeds]);

  const config: LookalikeConfig | null = useMemo(() => {
    const list = [...selected.entries()]
      .filter(([, ratios]) => ratios.length)
      .map(([id, ratios]) => ({ id, ratios }));
    return list.length ? { kind: "lookalike", country, seeds: list } : null;
  }, [selected, country]);

  useEffect(() => {
    const ratios = new Set(config?.seeds.flatMap((s) => s.ratios) ?? []);
    onChange({
      config,
      preview: config ? planLookalikeAudiences(config, seedNames) : [],
      summary: [
        { label: t("lookalike.summarySeeds"), value: config?.seeds.length ?? 0 },
        { label: t("lookalike.summaryRatios"), value: ratios.size },
        { label: t("lookalike.summaryCountry"), value: country }
      ]
    });
  }, [config, seedNames, country, onChange, t]);

  function toggleSeed(id: string) {
    setPresetId(CUSTOM_PRESET);
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(id)) next.delete(id);
      else next.set(id, [...defaultRatios]);
      return next;
    });
  }

  function setSeedRatios(id: string, ratios: BulkLookalikeRatio[]) {
    setPresetId(CUSTOM_PRESET);
    setSelected((prev) => new Map(prev).set(id, ratios));
  }

  function applyDefaultToAll() {
    setPresetId(CUSTOM_PRESET);
    setSelected((prev) => new Map([...prev.keys()].map((id) => [id, [...defaultRatios]])));
  }

  function applyPreset(id: string) {
    setPresetId(id);
    const preset = LOOKALIKE_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setCountry(preset.country);
    setDefaultRatios(preset.ratios);
    const ids = matchLookalikePresetSeeds(preset, seeds);
    setSelected(new Map(ids.map((sid) => [sid, [...preset.ratios]])));
  }

  const presetMatches = useMemo(() => {
    const preset = LOOKALIKE_PRESETS.find((p) => p.id === presetId);
    return preset ? matchLookalikePresetSeeds(preset, seeds).length : null;
  }, [presetId, seeds]);

  const ratioOptions = BULK_LOOKALIKE_RATIOS.map((r) => ({ value: String(r), label: `${r}%` }));
  const toRatios = (values: string[]) =>
    values.map(Number).sort((a, b) => a - b) as BulkLookalikeRatio[];

  return (
    <fieldset disabled={disabled} className="space-y-8 disabled:opacity-60">
      <div className="flex flex-wrap items-start gap-6">
        <PresetSelect
          value={presetId}
          onChange={applyPreset}
          options={[
            { value: CUSTOM_PRESET, label: t("presets.custom") },
            ...LOOKALIKE_PRESETS.map((p) => ({ value: p.id, label: t(p.labelKey) }))
          ]}
        />
        <label className="block w-56">
          <span className="ui-label">{t("lookalike.country")}</span>
          <select
            className="ui-select mt-1 w-full"
            value={country}
            onChange={(e) => setCountry(e.target.value as BulkLookalikeCountry)}
          >
            {BULK_LOOKALIKE_COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {t(`lookalike.countries.${c}`)} ({c})
              </option>
            ))}
          </select>
        </label>
      </div>

      {presetMatches === 0 ? (
        <p className="ui-alert-warning text-sm">{t("lookalike.presetNoMatch")}</p>
      ) : null}

      <section>
        <DsSectionHeader title={t("lookalike.defaultRatiosTitle")} description={t("lookalike.defaultRatiosHint")} />
        <div className="flex flex-wrap items-center gap-3">
          <DsSelectablePills
            size="md"
            surface="creator"
            options={ratioOptions}
            selected={defaultRatios.map(String)}
            onChange={(v) => setDefaultRatios(toRatios(v))}
          />
          <button
            type="button"
            className="ui-btn-secondary px-3 py-1.5 text-xs"
            disabled={!selected.size}
            onClick={applyDefaultToAll}
          >
            {t("lookalike.applyToAll")}
          </button>
        </div>
      </section>

      <section>
        <DsSectionHeader
          title={t("lookalike.seedsTitle")}
          description={t("lookalike.seedsHint")}
          actions={
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="ui-btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              {t("lookalike.refresh")}
            </button>
          }
        />
        <FilterSearchInput
          creatorField
          size="wide"
          className="mb-3 h-9 w-full"
          label={t("lookalike.search")}
          placeholder={t("lookalike.search")}
          value={search}
          onChange={setSearch}
        />
        <div className="max-h-[26rem] overflow-y-auto rounded-xl border border-[var(--border-color)]">
          {loading && !seeds.length ? (
            <p className="p-4 text-sm text-[var(--text-dim)]">{t("lookalike.loading")}</p>
          ) : loadError ? (
            <p className="p-4 text-sm text-[var(--danger,#dc2626)]">{loadError}</p>
          ) : visibleSeeds.length === 0 ? (
            <p className="p-4 text-sm text-[var(--text-dim)]">{t("lookalike.empty")}</p>
          ) : (
            <ul className="divide-y divide-[var(--border-color)]">
              {visibleSeeds.map((s) => {
                const ratios = selected.get(s.id);
                return (
                  <li key={s.id} className={cn("px-3 py-2", ratios && "bg-[var(--ui-accent-muted)]")}>
                    <label className="flex cursor-pointer items-center gap-3">
                      <input type="checkbox" checked={!!ratios} onChange={() => toggleSeed(s.id)} />
                      <span className="min-w-0 flex-1 truncate text-sm text-[var(--text-main)]">{s.name}</span>
                      {s.approximateCount != null ? (
                        <span className="shrink-0 text-[11px] text-[var(--text-dimmer)]">
                          {t("lookalike.size", { count: s.approximateCount })}
                        </span>
                      ) : null}
                    </label>
                    {ratios ? (
                      <DsSelectablePills
                        className="mt-2 pl-7"
                        surface="creator"
                        minSelected={0}
                        options={ratioOptions}
                        selected={ratios.map(String)}
                        onChange={(v) => setSeedRatios(s.id, toRatios(v))}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <p className="mt-2 text-[11px] text-[var(--text-dimmer)]">{t("lookalike.minSizeNote")}</p>
      </section>
    </fieldset>
  );
}
