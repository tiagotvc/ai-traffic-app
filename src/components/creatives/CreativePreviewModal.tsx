"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart2,
  BookImage,
  Image,
  Instagram,
  LayoutGrid,
  Monitor,
  Play,
  Smartphone,
  Star,
  Video,
  X
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { bestCreativePreviewUrl } from "@/lib/creative-preview-url";
import { formatMetricValue, METRIC_BY_KEY, type MetricKey } from "@/lib/dashboard-metrics";

const FORMATS = [
  { key: "MOBILE_FEED_STANDARD", labelKey: "fmtMobile", icon: Smartphone },
  { key: "DESKTOP_FEED_STANDARD", labelKey: "fmtDesktop", icon: Monitor },
  { key: "INSTAGRAM_STANDARD", labelKey: "fmtInstagram", icon: Instagram },
  { key: "INSTAGRAM_STORY", labelKey: "fmtStory", icon: BookImage }
] as const;

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

export function CreativePreviewModal({
  adId,
  adIds,
  imageUrl,
  name,
  rank = 1,
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

  const [mainTab, setMainTab] = useState<MainTab>(hasAds ? "preview" : "preview");
  const [format, setFormat] = useState<string>("MOBILE_FEED_STANDARD");
  const [detail, setDetail] = useState<DetailPayload | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(false);

  const score = Math.max(35, 100 - (rank - 1) * 8);
  const scoreColor = getScoreColor(score);
  const creativeType = mapCreativeType(type);
  const statusLabel = mapStatusLabel(status);
  const isFirst = rank === 1;

  const metricStrip = useMemo(
    () =>
      [
        { key: "roas" as MetricKey, color: "#10b981" },
        { key: "ctr" as MetricKey, color: "var(--text-main)" },
        { key: "cpa" as MetricKey, color: "var(--text-main)" },
        { key: "cpm" as MetricKey, color: "var(--text-main)" },
        { key: "impressions" as MetricKey, color: "var(--text-main)" },
        { key: "spend" as MetricKey, color: "#f5a623" }
      ].filter((m) => metrics?.[m.key] != null || m.key === "ctr" || m.key === "spend"),
    [metrics]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

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

  const previewW = preview?.width ?? 360;
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-[720px] flex-col rounded-2xl shadow-2xl"
        style={{ background: "var(--surface-card)", border: "1px solid var(--border-color)" }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          className="flex shrink-0 items-start justify-between px-6 py-4"
          style={{ borderBottom: "1px solid var(--border-color)" }}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
              style={{
                background: isFirst ? "#f5a623" : "var(--surface-bg)",
                color: isFirst ? "#fff" : "var(--text-dim)",
                border: !isFirst ? "1px solid var(--border-color)" : "none"
              }}
            >
              {isFirst ? <Star size={13} fill="#fff" color="#fff" /> : `#${rank}`}
            </div>
            <div className="min-w-0">
              <h2 className="truncate pr-2 text-base font-semibold text-[var(--text-main)]">{name}</h2>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                  style={{ background: "rgba(245,166,35,0.12)", color: "var(--amber)" }}
                >
                  {creativeType === "Video" && <Video size={10} />}
                  {creativeType === "Imagem" && <Image size={10} />}
                  {creativeType === "Carrossel" && <LayoutGrid size={10} />}
                  {creativeType}
                </span>
                {campaignType ? (
                  <span
                    className="rounded-full px-2 py-0.5 text-xs"
                    style={{ background: "rgba(245,166,35,0.08)", color: "var(--text-dim)" }}
                  >
                    {campaignType}
                  </span>
                ) : null}
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-semibold"
                  style={{
                    background: statusLabel === "Ativo" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.1)",
                    color: statusLabel === "Ativo" ? "#10b981" : "#ef4444"
                  }}
                >
                  ● {statusLabel}
                </span>
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-bold"
                  style={{ background: `${scoreColor}20`, color: scoreColor }}
                >
                  Score {score}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors"
            style={{ background: "var(--row-hover)" }}
            aria-label="close"
          >
            <X size={16} style={{ color: "var(--text-dim)" }} />
          </button>
        </div>

        {metrics ? (
          <div
            className="flex shrink-0 flex-wrap items-center gap-4 px-6 py-3"
            style={{ borderBottom: "1px solid var(--border-color)", background: "var(--surface-bg)" }}
          >
            {metricStrip.map((m) => (
              <div key={m.key} className="flex flex-col">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
                  {tMetrics(METRIC_BY_KEY[m.key].label)}
                </span>
                <span className="text-sm font-bold" style={{ color: m.color }}>
                  {formatMetricValue(m.key, Number(metrics[m.key] ?? 0), locale)}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        {hasAds ? (
          <div
            className="flex shrink-0 gap-1 px-6 pt-3"
            style={{ borderBottom: "1px solid var(--border-color)" }}
          >
            {mainTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setMainTab(tab.key)}
                className="rounded-t-lg px-4 py-2 text-sm font-medium transition-all"
                style={{
                  color: mainTab === tab.key ? "var(--amber)" : "var(--text-dim)",
                  background: mainTab === tab.key ? "rgba(245,166,35,0.08)" : "transparent",
                  borderBottom: mainTab === tab.key ? "2px solid var(--amber)" : "2px solid transparent"
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
          {mainTab === "copy" ? (
            <div className="space-y-4 px-6 py-6">
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
            <div className="space-y-3 px-6 py-6">
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
                          style={{ background: "rgba(245,166,35,0.12)" }}
                        >
                          <BarChart2 size={15} style={{ color: "var(--amber)" }} />
                        </div>
                        <div>
                          <Link
                            href={`/campaigns/${c.id}?client=${encodeURIComponent(usage.clientSlug)}`}
                            className="text-sm font-semibold text-[var(--text-main)] hover:text-[var(--amber)]"
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
            <div className="px-6 py-5">
              <div className="mb-5 flex flex-wrap items-center gap-2">
                {FORMATS.map((f) => {
                  const Icon = f.icon;
                  const active = format === f.key;
                  return (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setFormat(f.key)}
                      className="flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm transition-all"
                      style={{
                        background: active ? "var(--amber)" : "var(--surface-bg)",
                        color: active ? "#0f1419" : "var(--text-dim)",
                        borderColor: active ? "var(--amber)" : "var(--border-color)",
                        fontWeight: active ? 600 : 400
                      }}
                    >
                      <Icon size={13} />
                      {t(f.labelKey)}
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
            <div className="flex items-center justify-center px-6 py-8">
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
            <div className="px-6 py-6">
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-bg)] p-4">
                <p className="text-sm leading-relaxed text-[var(--text-main)]">{primaryBody}</p>
              </div>
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-[var(--text-dim)]">{t("previewUnavailable")}</p>
          )}
        </div>

        <div
          className="flex shrink-0 items-center justify-end px-6 py-4"
          style={{ borderTop: "1px solid var(--border-color)" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-5 py-2 text-sm font-semibold"
            style={{ background: "var(--amber)", color: "#0f1419" }}
          >
            {t("close")}
          </button>
        </div>
      </div>
    </div>
  );
}
