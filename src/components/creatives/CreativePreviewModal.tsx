"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart2,
  BookImage,
  Eye,
  Image,
  Instagram,
  LayoutGrid,
  Monitor,
  Play,
  Smartphone,
  Star,
  Video
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { CreatorModalShell } from "@/components/campaign-creator/CreatorModalShell";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { bestCreativePreviewUrl } from "@/lib/creative-preview-url";
import { formatMetricValue, METRIC_BY_KEY, type MetricKey } from "@/lib/dashboard-metrics";

const FORMATS = [
  { key: "MOBILE_FEED_STANDARD", labelKey: "fmtMobile", icon: Smartphone },
  { key: "DESKTOP_FEED_STANDARD", labelKey: "fmtDesktop", icon: Monitor },
  { key: "INSTAGRAM_STANDARD", labelKey: "fmtInstagram", icon: Instagram },
  { key: "INSTAGRAM_STORY", labelKey: "fmtStory", icon: BookImage }
] as const;

const METRIC_GROUPS: Array<{ labelKey: string; keys: MetricKey[] }> = [
  { labelKey: "previewGroupPerformance", keys: ["roas", "cpa", "conversions"] },
  { labelKey: "previewGroupEngagement", keys: ["ctr", "cpc", "cpmsg"] },
  { labelKey: "previewGroupDelivery", keys: ["cpm", "impressions", "reach", "frequency"] },
  { labelKey: "previewGroupSpend", keys: ["spend"] }
];

type Copy = { bodies: string[]; titles: string[]; descriptions: string[]; ctas: string[] };
type CopyByCampaign = {
  campaignId: string;
  campaignName: string;
  adsetName: string;
  adId: string;
  copy: Copy;
};
type Preview = { src: string; width: number | null; height: number | null };
type AdItem = { id: string; name: string; status: string | null };
type Adset = { id: string | null; name: string; ads: AdItem[] };
type Campaign = { id: string; name: string; adsets: Adset[] };
type Placement = {
  adsetId: string;
  adsetName: string;
  campaignName: string;
  platforms: string[];
  positions: string[];
};
type DetailPayload = {
  previewAdId: string | null;
  preview: Preview | null;
  copy: Copy;
  copiesByCampaign: CopyByCampaign[];
  placements: Placement[];
  campaigns: Campaign[];
  clientSlug: string;
};

type MainTab = "preview" | "copy" | "usage";

function getScoreColor(score: number) {
  if (score >= 80) return "#10b981";
  if (score >= 60) return "#f5a623";
  return "#ef4444";
}

function mapCreativeType(type?: string): "Video" | "Imagem" | "Carrossel" {
  const t = (type ?? "").toLowerCase();
  if (t.includes("video")) return "Video";
  if (t.includes("carousel") || t.includes("carrossel")) return "Carrossel";
  return "Imagem";
}

function mapStatusLabel(status?: string): "Ativo" | "Pausado" | "Encerrado" {
  const s = (status ?? "").toUpperCase();
  if (s === "ACTIVE") return "Ativo";
  if (s === "PAUSED") return "Pausado";
  return "Encerrado";
}

function MetricTile({
  metricKey,
  value,
  locale,
  label,
  accent
}: {
  metricKey: MetricKey;
  value: number;
  locale: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2",
        accent
          ? "border-emerald-500/20 bg-emerald-500/8"
          : "border-[var(--creator-card-border,var(--border-color))] bg-[var(--surface-card)]"
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">{label}</p>
      <p
        className={cn("mt-0.5 text-sm font-bold", accent ? "text-emerald-500" : "text-[var(--text-main)]")}
      >
        {formatMetricValue(metricKey, value, locale)}
      </p>
    </div>
  );
}

export function CreativePreviewModal({
  adId,
  adIds,
  imageUrl,
  name,
  rank = 1,
  score: scoreProp,
  type,
  campaignType,
  status,
  metrics,
  campaignsUsed = 0,
  onClose
}: {
  adId: string | null;
  adIds?: string[];
  imageUrl: string | null;
  name: string;
  rank?: number;
  score?: number;
  type?: string;
  campaignType?: string;
  status?: string;
  metrics?: Partial<Record<MetricKey, number>>;
  campaignsUsed?: number;
  onClose: () => void;
}) {
  const t = useTranslations("creativesPerf");
  const tMetrics = useTranslations("metrics");
  const locale = useLocale();
  const resolvedAdIds = (adIds?.length ? adIds : adId ? [adId] : []).filter(Boolean);
  const hasAds = resolvedAdIds.length > 0;
  const adIdsKey = resolvedAdIds.join(",");
  const previewImage = bestCreativePreviewUrl(imageUrl, imageUrl);

  const [mainTab, setMainTab] = useState<MainTab>("preview");
  const [format, setFormat] = useState<string>("MOBILE_FEED_STANDARD");
  const [detail, setDetail] = useState<DetailPayload | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(false);

  const score = scoreProp ?? Math.max(35, 100 - (rank - 1) * 8);
  const scoreColor = getScoreColor(score);
  const creativeType = mapCreativeType(type);
  const statusLabel = mapStatusLabel(status);
  const isFirst = rank === 1;

  const metricGroups = useMemo(() => {
    if (!metrics) return [];
    return METRIC_GROUPS.map((group) => ({
      label: t(group.labelKey),
      items: group.keys
        .filter((key) => metrics[key] != null && Number(metrics[key]) > 0)
        .map((key) => ({
          key,
          label: tMetrics(METRIC_BY_KEY[key].label),
          value: Number(metrics[key] ?? 0)
        }))
    })).filter((group) => group.items.length > 0);
  }, [metrics, t, tMetrics]);

  useEffect(() => {
    if (!hasAds) return;
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(false);
    setDetail(null);
    const qs = new URLSearchParams({ adIds: adIdsKey });
    fetch(`/api/creatives/detail?${qs}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j.ok) {
          setDetail({
            previewAdId: j.previewAdId ?? null,
            preview: j.preview ?? null,
            copy: j.copy as Copy,
            copiesByCampaign: j.copiesByCampaign ?? [],
            placements: j.placements ?? [],
            campaigns: j.campaigns ?? [],
            clientSlug: j.clientSlug ?? ""
          });
        } else {
          setDetailError(true);
        }
      })
      .catch(() => {
        if (!cancelled) setDetailError(true);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hasAds, adIdsKey]);

  useEffect(() => {
    if (!hasAds || mainTab !== "preview") return;
    let cancelled = false;
    setLoading(true);
    setErr(false);
    setPreview(null);

    const loadPreview = async () => {
      const qs = new URLSearchParams({ adIds: adIdsKey, format });
      const res = await fetch(`/api/creatives/detail?${qs}`);
      const j = await res.json();
      if (cancelled) return;
      if (j.ok && j.preview?.src) {
        setPreview(j.preview);
      } else {
        setErr(true);
      }
      setLoading(false);
    };

    void loadPreview();
    return () => {
      cancelled = true;
    };
  }, [hasAds, format, mainTab, adIdsKey]);

  const copiesToShow =
    detail?.copiesByCampaign?.length &&
    detail.copiesByCampaign.some(
      (c) =>
        c.copy.bodies.length ||
        c.copy.titles.length ||
        c.copy.descriptions.length ||
        c.copy.ctas.length
    )
      ? detail.copiesByCampaign
      : null;

  const mergedCopy = detail?.copy ?? null;
  const isCopyEmpty =
    !copiesToShow &&
    mergedCopy &&
    !mergedCopy.bodies.length &&
    !mergedCopy.titles.length &&
    !mergedCopy.descriptions.length &&
    !mergedCopy.ctas.length;

  const usage = detail
    ? { campaigns: detail.campaigns, clientSlug: detail.clientSlug, placements: detail.placements }
    : null;

  const previewH = preview?.height ?? 640;
  const primaryBody = mergedCopy?.bodies[0] ?? copiesToShow?.[0]?.copy.bodies[0] ?? "";

  function CopyBlock({ label, items }: { label: string; items: string[] }) {
    if (!items.length) return null;
    return (
      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-bg)] p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">{label}</p>
        <div className="space-y-1.5">
          {items.map((txt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => navigator.clipboard?.writeText(txt)}
              title={t("copied")}
              className="block w-full whitespace-pre-wrap rounded-lg bg-[var(--surface-card)] px-3 py-2 text-left text-sm text-[var(--text-main)] hover:bg-[var(--row-hover)]"
            >
              {txt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  function CopySection({ copy }: { copy: Copy }) {
    return (
      <>
        <CopyBlock label={t("copyBodies")} items={copy.bodies} />
        <CopyBlock label={t("copyTitles")} items={copy.titles} />
        <CopyBlock label={t("copyDescriptions")} items={copy.descriptions} />
        <CopyBlock label={t("copyCtas")} items={copy.ctas} />
      </>
    );
  }

  const mainTabs: { key: MainTab; label: string }[] = [
    { key: "preview", label: t("fmtAd") },
    { key: "copy", label: t("copyTab") },
    { key: "usage", label: t("usageTab") }
  ];

  return (
    <CreatorModalShell
      open
      onClose={onClose}
      title={name}
      subtitle={campaignType}
      titleIcon={<Eye size={18} aria-hidden />}
      width="lg"
      onPrimary={onClose}
      primaryLabel={t("close")}
      showPrimaryCheck={false}
      contentClassName="flex min-h-0 flex-1 flex-col overflow-hidden !p-0"
    >
      <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-[var(--border-color)] px-5 py-2.5">
        <div
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
          style={{
            background: isFirst ? "#f5a623" : "var(--creator-card-bg-inset,var(--surface-bg))",
            color: isFirst ? "#fff" : "var(--text-dim)",
            border: !isFirst ? "1px solid var(--creator-card-border,var(--border-color))" : "none"
          }}
        >
          {isFirst ? <Star size={11} fill="#fff" color="#fff" /> : `#${rank}`}
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)] px-2 py-0.5 text-[10px] font-semibold text-[var(--ui-accent)]">
          {creativeType === "Video" && <Video size={10} />}
          {creativeType === "Imagem" && <Image size={10} />}
          {creativeType === "Carrossel" && <LayoutGrid size={10} />}
          {creativeType}
        </span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
            statusLabel === "Ativo"
              ? "ds-table-compact-badge ds-table-compact-badge--success"
              : "ds-table-compact-badge ds-table-compact-badge--neutral"
          )}
        >
          {statusLabel}
        </span>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-bold"
          style={{ background: `${scoreColor}20`, color: scoreColor }}
        >
          Score {score}
        </span>
      </div>

      {metricGroups.length ? (
        <div className="shrink-0 space-y-3 border-b border-[var(--border-color)] bg-[var(--creator-card-bg-inset,var(--surface-bg))] px-5 py-3">
          {metricGroups.map((group) => (
            <div key={group.label}>
              <p className="campaign-creator-orion-section-label mb-2">{group.label}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {group.items.map((item) => (
                  <MetricTile
                    key={item.key}
                    metricKey={item.key}
                    value={item.value}
                    locale={locale}
                    label={item.label}
                    accent={item.key === "roas"}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {hasAds ? (
        <div className="flex shrink-0 gap-1 border-b border-[var(--border-color)] px-5 py-2">
          {mainTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setMainTab(tab.key)}
              className={cn(
                "campaign-creator-budget-choice-card campaign-creator-budget-choice-card--chip-sm",
                mainTab === tab.key
                  ? "campaign-creator-budget-choice-card--selected"
                  : "campaign-creator-budget-choice-card--unselected"
              )}
            >
              <span className="campaign-creator-budget-choice-card__label">{tab.label}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain" style={{ scrollbarWidth: "thin" }}>
        {mainTab === "copy" ? (
          <div className="space-y-4 px-5 py-5">
            {detailLoading ? (
              <p className="py-8 text-center text-sm text-[var(--text-dim)]">{t("copyLoading")}</p>
            ) : detailError ? (
              <p className="py-8 text-center text-sm text-[var(--text-dim)]">{t("copyEmpty")}</p>
            ) : copiesToShow ? (
              copiesToShow.map((row) => (
                <div key={`${row.campaignId}-${row.adId}`} className="space-y-3">
                  <div className="text-sm font-semibold text-[var(--text-main)]">{row.campaignName}</div>
                  <div className="text-[11px] text-[var(--text-dim)]">
                    {t("colAdset")}: {row.adsetName}
                  </div>
                  <CopySection copy={row.copy} />
                </div>
              ))
            ) : isCopyEmpty || !mergedCopy ? (
              <p className="py-8 text-center text-sm text-[var(--text-dim)]">{t("copyEmpty")}</p>
            ) : (
              <CopySection copy={mergedCopy} />
            )}
          </div>
        ) : mainTab === "usage" ? (
          <div className="space-y-3 px-5 py-5">
            {detailLoading ? (
              <p className="py-8 text-center text-sm text-[var(--text-dim)]">{t("copyLoading")}</p>
            ) : !usage || !usage.campaigns.length ? (
              <p className="py-8 text-center text-sm text-[var(--text-dim)]">{t("usageEmpty")}</p>
            ) : (
              <>
                <p className="mb-4 text-sm text-[var(--text-dim)]">
                  {t("usedInCampaigns", { n: campaignsUsed || usage.campaigns.length })}
                </p>
                {usage.placements.length ? (
                  <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-bg)] p-4">
                    <div className="text-sm font-semibold text-[var(--text-main)]">{t("placementsTitle")}</div>
                    <div className="mt-2 space-y-2">
                      {usage.placements.map((p) => (
                        <div key={p.adsetId} className="rounded-lg bg-[var(--surface-card)] p-2">
                          <div className="text-xs font-medium text-[var(--text-dim)]">
                            {p.campaignName} · {p.adsetName}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {usage.campaigns.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-xl border border-[var(--border-color)] bg-[var(--surface-bg)] p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-lg"
                        style={{ background: "var(--ui-accent-muted)" }}
                      >
                        <BarChart2 size={15} style={{ color: "var(--ui-accent)" }} />
                      </div>
                      <div>
                        <Link
                          href={`/campaigns/${c.id}?client=${encodeURIComponent(usage.clientSlug)}`}
                          className="text-sm font-semibold text-[var(--text-main)] hover:text-[var(--ui-accent)]"
                        >
                          {c.name}
                        </Link>
                      </div>
                    </div>
                    <span
                      className="rounded-full px-2.5 py-1 text-xs font-semibold"
                      style={{ background: "rgba(16,185,129,0.12)", color: "#10b981" }}
                    >
                      Ativa
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        ) : loading || detailLoading ? (
          <p className="py-12 text-center text-sm text-[var(--text-dim)]">{t("previewLoading")}</p>
        ) : preview && !err && hasAds ? (
          <div className="px-5 py-5">
            <div className="mb-4 flex flex-wrap items-center gap-1.5">
              {FORMATS.map((f) => {
                const Icon = f.icon;
                const active = format === f.key;
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFormat(f.key)}
                    className={cn(
                      "campaign-creator-budget-choice-card campaign-creator-budget-choice-card--chip-with-icon inline-flex items-center gap-1.5",
                      active
                        ? "campaign-creator-budget-choice-card--selected"
                        : "campaign-creator-budget-choice-card--unselected"
                    )}
                  >
                    <Icon size={12} aria-hidden />
                    <span className="campaign-creator-budget-choice-card__label">{t(f.labelKey)}</span>
                  </button>
                );
              })}
            </div>
            <div className="mx-auto w-full overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface-card)] shadow-lg">
              <iframe
                title="ad-preview"
                src={preview.src}
                scrolling="yes"
                style={{ width: "100%", height: previewH, minHeight: 480 }}
                className="block border-0"
              />
            </div>
          </div>
        ) : previewImage ? (
          <div className="relative flex items-center justify-center px-5 py-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewImage}
              alt={name}
              className="max-h-[480px] max-w-full rounded-xl object-contain"
            />
            {creativeType === "Video" ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-full"
                  style={{ background: "rgba(0,0,0,0.55)" }}
                >
                  <Play size={22} fill="#fff" style={{ color: "#fff", marginLeft: 3 }} />
                </div>
              </div>
            ) : null}
          </div>
        ) : primaryBody ? (
          <div className="px-5 py-6">
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-bg)] p-4">
              <p className="text-sm leading-relaxed text-[var(--text-main)]">{primaryBody}</p>
            </div>
          </div>
        ) : (
          <p className="py-12 text-center text-sm text-[var(--text-dim)]">{t("previewUnavailable")}</p>
        )}
      </div>
    </CreatorModalShell>
  );
}
