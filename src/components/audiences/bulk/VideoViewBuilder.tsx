"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { FilterSearchInput } from "@/components/FilterSearchInput";
import { DsSectionHeader } from "@/design-system";
import { normalizeVideoViewCells, planVideoViewAudiences } from "@/lib/audiences/bulk/builders";
import { VIDEO_VIEW_PRESETS } from "@/lib/audiences/bulk/presets";
import {
  VIDEO_VIEW_PERCENTS,
  VIDEO_VIEW_RETENTION_DAYS,
  type VideoViewCell,
  type VideoViewConfig,
  type VideoViewPercent,
  type VideoViewRetentionDays
} from "@/lib/audiences/bulk/types";
import { cn } from "@/lib/cn";

import { PresetSelect } from "./PresetSelect";
import type { BulkBuilderProps } from "./types";

type VideoOption = {
  id: string;
  /** Nome do anúncio que usa o vídeo. */
  title: string;
  picture?: string | null;
  adCount: number;
};

const CUSTOM_PRESET = "custom";

function cellKey(percent: number, days: number) {
  return `${percent}:${days}`;
}

export function VideoViewBuilder({ clientSlug, adAccountId, disabled, onChange }: BulkBuilderProps) {
  const t = useTranslations("audiencesBulk");
  const [videos, setVideos] = useState<VideoOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  /** Nome do grupo de vídeos no nome do público (ex.: "ANÚNCIO 01"). */
  const [label, setLabel] = useState("");
  const [presetId, setPresetId] = useState(VIDEO_VIEW_PRESETS[0]!.id);
  const [cells, setCells] = useState<Set<string>>(
    () => new Set(VIDEO_VIEW_PRESETS[0]!.cells.map((c) => cellKey(c.percent, c.retentionDays)))
  );

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setLoadError(null);
    const qs = new URLSearchParams({ clientId: clientSlug, adAccountId, type: "video" });
    fetch(`/api/meta/audience-creation/options?${qs}`)
      .then((r) => r.json())
      .then((j: { ok: boolean; videos?: VideoOption[]; error?: string }) => {
        if (!alive) return;
        if (j.ok) setVideos(j.videos ?? []);
        else setLoadError(j.error ?? t("loadError"));
      })
      .catch(() => alive && setLoadError(t("loadError")))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [clientSlug, adAccountId, t]);

  const visibleVideos = useMemo(() => {
    const q = search.trim().toLowerCase();
    return videos.filter(
      (v) =>
        !q || v.title.toLowerCase().includes(q) || v.id.includes(q)
    );
  }, [videos, search]);

  const config: VideoViewConfig | null = useMemo(() => {
    const cellList: VideoViewCell[] = [];
    for (const p of VIDEO_VIEW_PERCENTS) {
      for (const d of VIDEO_VIEW_RETENTION_DAYS) {
        if (cells.has(cellKey(p, d))) cellList.push({ percent: p, retentionDays: d });
      }
    }
    const trimmed = label.trim();
    if (!selected.size || !cellList.length || !trimmed) return null;
    return { kind: "video_view", videoIds: [...selected], label: trimmed, cells: cellList };
  }, [selected, label, cells]);

  useEffect(() => {
    const normalized = config ? normalizeVideoViewCells(config.cells) : [];
    onChange({
      config,
      preview: config ? planVideoViewAudiences(config) : [],
      summary: [
        { label: t("videoView.summaryVideos"), value: selected.size },
        { label: t("videoView.summaryPercents"), value: new Set(normalized.map((c) => c.percent)).size },
        {
          label: t("videoView.summaryRetentions"),
          value: new Set(normalized.map((c) => c.retentionDays)).size
        }
      ]
    });
  }, [config, selected.size, onChange, t]);

  function toggleVideo(v: VideoOption) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(v.id)) next.delete(v.id);
      else next.add(v.id);
      return next;
    });
  }

  // "Selecionar todos" age só no que está visível: respeita origem e busca.
  const visibleSelected = visibleVideos.filter((v) => selected.has(v.id)).length;
  const allVisibleSelected = visibleVideos.length > 0 && visibleSelected === visibleVideos.length;

  function toggleAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const v of visibleVideos) {
        if (allVisibleSelected) next.delete(v.id);
        else next.add(v.id);
      }
      return next;
    });
  }

  function applyPreset(id: string) {
    setPresetId(id);
    const preset = VIDEO_VIEW_PRESETS.find((p) => p.id === id);
    if (preset) setCells(new Set(preset.cells.map((c) => cellKey(c.percent, c.retentionDays))));
  }

  function setCellGroup(keys: string[], on: boolean) {
    setPresetId(CUSTOM_PRESET);
    setCells((prev) => {
      const next = new Set(prev);
      for (const k of keys) {
        if (on) next.add(k);
        else next.delete(k);
      }
      return next;
    });
  }

  const rowKeys = (p: VideoViewPercent) => VIDEO_VIEW_RETENTION_DAYS.map((d) => cellKey(p, d));
  const colKeys = (d: VideoViewRetentionDays) => VIDEO_VIEW_PERCENTS.map((p) => cellKey(p, d));
  const allOn = (keys: string[]) => keys.every((k) => cells.has(k));

  return (
    <fieldset disabled={disabled} className="space-y-8 disabled:opacity-60">
      <PresetSelect
        value={presetId}
        onChange={applyPreset}
        options={[
          ...VIDEO_VIEW_PRESETS.map((p) => ({ value: p.id, label: t(p.labelKey) })),
          { value: CUSTOM_PRESET, label: t("presets.custom") }
        ]}
      />

      <label className="block max-w-md">
        <span className="ui-label">{t("videoView.groupName")}</span>
        <input
          className="ui-input mt-1 w-full"
          value={label}
          maxLength={80}
          placeholder={t("videoView.groupNamePlaceholder")}
          onChange={(e) => setLabel(e.target.value)}
        />
        <span className="mt-1 block text-[11px] text-[var(--text-dimmer)]">{t("videoView.groupNameHint")}</span>
      </label>

      <section>
        <DsSectionHeader
          title={t("videoView.videosTitle")}
          description={t("videoView.videosHint")}
          actions={
            selected.size ? (
              <span className="text-xs font-medium text-[var(--ui-accent)]">
                {t("videoView.selectedCount", { count: selected.size })}
              </span>
            ) : null
          }
        />
        <FilterSearchInput
          creatorField
          size="wide"
          className="mb-3 h-9 w-full"
          label={t("videoView.search")}
          placeholder={t("videoView.search")}
          value={search}
          onChange={setSearch}
        />

        <div className="max-h-[22rem] overflow-y-auto rounded-xl border border-[var(--border-color)]">
          {loading ? (
            <p className="p-4 text-sm text-[var(--text-dim)]">{t("videoView.loading")}</p>
          ) : loadError ? (
            <p className="p-4 text-sm text-[var(--danger,#dc2626)]">{loadError}</p>
          ) : visibleVideos.length === 0 ? (
            <p className="p-4 text-sm text-[var(--text-dim)]">{t("videoView.empty")}</p>
          ) : (
            <ul className="divide-y divide-[var(--border-color)]">
              <li className="sticky top-0 z-10 bg-[var(--surface-card)] px-3 py-2">
                <label className="flex cursor-pointer items-center gap-3 text-xs font-medium text-[var(--text-dim)]">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = visibleSelected > 0 && !allVisibleSelected;
                    }}
                    onChange={toggleAllVisible}
                  />
                  {allVisibleSelected
                    ? t("videoView.deselectAll")
                    : t("videoView.selectAll", { count: visibleVideos.length })}
                </label>
              </li>
              {visibleVideos.map((v) => {
                const isOn = selected.has(v.id);
                return (
                  <li key={v.id} className={cn("px-3 py-2", isOn && "bg-[var(--ui-accent-muted)]")}>
                    <label className="flex cursor-pointer items-center gap-3">
                      <input type="checkbox" checked={isOn} onChange={() => toggleVideo(v)} />
                      {v.picture ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={v.picture} alt="" className="h-9 w-14 shrink-0 rounded object-cover" />
                      ) : (
                        <span className="h-9 w-14 shrink-0 rounded bg-[var(--surface-bg)]" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-[var(--text-main)]">{v.title}</span>
                        <span className="block truncate text-[11px] text-[var(--text-dimmer)]">
                          {t("videoView.usedInAds", { count: v.adCount })} · {v.id}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section>
        <DsSectionHeader title={t("videoView.matrixTitle")} description={t("videoView.matrixHint")} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] border-separate border-spacing-1 text-sm">
            <thead>
              <tr>
                <th />
                {VIDEO_VIEW_RETENTION_DAYS.map((d) => (
                  <th key={d} className="p-0">
                    <button
                      type="button"
                      onClick={() => setCellGroup(colKeys(d), !allOn(colKeys(d)))}
                      className="w-full rounded-md px-2 py-1 text-xs font-semibold text-[var(--text-dim)] hover:text-[var(--ui-accent)]"
                      title={t("videoView.toggleColumn")}
                    >
                      {d}D
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {VIDEO_VIEW_PERCENTS.map((p) => (
                <tr key={p}>
                  <th className="p-0 text-left">
                    <button
                      type="button"
                      onClick={() => setCellGroup(rowKeys(p), !allOn(rowKeys(p)))}
                      className="w-full rounded-md px-2 py-1 text-left text-xs font-semibold text-[var(--text-dim)] hover:text-[var(--ui-accent)]"
                      title={t("videoView.toggleRow")}
                    >
                      {t("videoView.percentRow", { percent: p })}
                    </button>
                  </th>
                  {VIDEO_VIEW_RETENTION_DAYS.map((d) => {
                    const k = cellKey(p, d);
                    const on = cells.has(k);
                    return (
                      <td key={d} className="p-0">
                        <button
                          type="button"
                          aria-pressed={on}
                          onClick={() => setCellGroup([k], !on)}
                          className={cn(
                            "h-9 w-full rounded-lg border text-xs font-medium transition",
                            on
                              ? "border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]"
                              : "border-[var(--border-color)] text-[var(--text-dimmer)] hover:border-[var(--ui-accent-border)]"
                          )}
                        >
                          {p}% · {d}D
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </fieldset>
  );
}
