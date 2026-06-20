"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

const FORMATS = [
  { key: "MOBILE_FEED_STANDARD", label: "fmtMobile" },
  { key: "DESKTOP_FEED_STANDARD", label: "fmtDesktop" },
  { key: "INSTAGRAM_STANDARD", label: "fmtInstagram" },
  { key: "INSTAGRAM_STORY", label: "fmtStory" }
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

export function CreativePreviewModal({
  adId,
  adIds,
  imageUrl,
  name,
  onClose
}: {
  adId: string | null;
  adIds?: string[];
  imageUrl: string | null;
  name: string;
  onClose: () => void;
}) {
  const t = useTranslations("creativesPerf");
  const resolvedAdIds = (adIds?.length ? adIds : adId ? [adId] : []).filter(Boolean);
  const hasAds = resolvedAdIds.length > 0;
  const adIdsKey = resolvedAdIds.join(",");

  const [mode, setMode] = useState<"image" | "preview" | "copy" | "usage">(
    hasAds ? "preview" : "image"
  );
  const [format, setFormat] = useState<string>("MOBILE_FEED_STANDARD");
  const [detail, setDetail] = useState<DetailPayload | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(false);

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
    if (!hasAds || mode !== "preview") return;
    let cancelled = false;
    setLoading(true);
    setErr(false);
    setPreview(null);

    const loadPreview = async () => {
      const qs = new URLSearchParams({
        adIds: adIdsKey,
        format
      });
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
  }, [hasAds, format, mode, adIdsKey]);

  const tabClass = (active: boolean) =>
    `rounded-lg px-2.5 py-1 text-xs font-medium ${
      active ? "bg-[rgba(124,58,237,0.1)] text-[var(--violet)]" : "text-[var(--text-dim)] hover:bg-[var(--surface-bg)]"
    }`;

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

  const panelWidth = mode === "image" ? "max-w-5xl" : mode === "preview" ? "max-w-3xl" : "max-w-lg";

  function CopyBlock({ label, items }: { label: string; items: string[] }) {
    if (!items.length) return null;
    return (
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">{label}</div>
        <div className="mt-1 space-y-1.5">
          {items.map((txt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => navigator.clipboard?.writeText(txt)}
              title={t("copied")}
              className="block w-full whitespace-pre-wrap rounded-lg bg-[var(--surface-bg)] px-3 py-2 text-left text-sm text-[var(--text-dim)] hover:bg-[var(--surface-bg)]"
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
        <CopyBlock label={t("copyTitles")} items={copy.titles} />
        <CopyBlock label={t("copyBodies")} items={copy.bodies} />
        <CopyBlock label={t("copyDescriptions")} items={copy.descriptions} />
        <CopyBlock label={t("copyCtas")} items={copy.ctas} />
      </>
    );
  }

  const previewW = preview?.width ?? 360;
  const previewH = preview?.height ?? 640;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-4 sm:items-center"
      onMouseDown={onClose}
    >
      <div
        className={`my-auto flex max-h-[92vh] w-full flex-col rounded-2xl bg-[var(--surface-card)] shadow-2xl ${panelWidth}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--border-color)] px-4 py-3">
          <div className="min-w-0 truncate text-sm font-semibold text-[var(--text-main)]">{name}</div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--text-dimmer)] hover:bg-[var(--surface-bg)] hover:text-[var(--text-dim)]"
            aria-label="close"
          >
            ✕
          </button>
        </div>

        {hasAds ? (
          <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-[var(--border-color)] px-4 py-2">
            <button type="button" onClick={() => setMode("preview")} className={tabClass(mode === "preview")}>
              {t("fmtAd")}
            </button>
            <button type="button" onClick={() => setMode("copy")} className={tabClass(mode === "copy")}>
              {t("copyTab")}
            </button>
            <button type="button" onClick={() => setMode("usage")} className={tabClass(mode === "usage")}>
              {t("usageTab")}
            </button>
            {mode === "preview" ? (
              <span className="ml-auto flex flex-wrap gap-1">
                {FORMATS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFormat(f.key)}
                    className={tabClass(format === f.key)}
                  >
                    {t(f.label)}
                  </button>
                ))}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--surface-bg)] p-3">
          {mode === "copy" ? (
            <div className="mx-auto w-full max-w-lg space-y-4">
              {detailLoading ? (
                <p className="py-8 text-center text-sm text-[var(--text-dim)]">{t("copyLoading")}</p>
              ) : detailError ? (
                <p className="py-8 text-center text-sm text-[var(--text-dim)]">{t("copyEmpty")}</p>
              ) : copiesToShow ? (
                copiesToShow.map((row) => (
                  <div
                    key={`${row.campaignId}-${row.adId}`}
                    className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-card)] p-3"
                  >
                    <div className="text-sm font-semibold text-[var(--text-main)]">{row.campaignName}</div>
                    <div className="text-[11px] text-[var(--text-dim)]">
                      {t("colAdset")}: {row.adsetName}
                    </div>
                    <div className="mt-3 space-y-3">
                      <CopySection copy={row.copy} />
                    </div>
                  </div>
                ))
              ) : isCopyEmpty || !mergedCopy ? (
                <p className="py-8 text-center text-sm text-[var(--text-dim)]">{t("copyEmpty")}</p>
              ) : (
                <CopySection copy={mergedCopy} />
              )}
            </div>
          ) : mode === "usage" ? (
            <div className="mx-auto w-full max-w-lg space-y-3">
              {detailLoading ? (
                <p className="py-8 text-center text-sm text-[var(--text-dim)]">{t("copyLoading")}</p>
              ) : !usage || !usage.campaigns.length ? (
                <p className="py-8 text-center text-sm text-[var(--text-dim)]">{t("usageEmpty")}</p>
              ) : (
                <>
                  {usage.placements.length ? (
                    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-card)] p-3">
                      <div className="text-sm font-semibold text-[var(--text-main)]">{t("placementsTitle")}</div>
                      <div className="mt-2 space-y-2">
                        {usage.placements.map((p) => (
                          <div key={p.adsetId} className="rounded-lg bg-[var(--surface-bg)] p-2">
                            <div className="text-xs font-medium text-[var(--text-dim)]">
                              {p.campaignName} · {p.adsetName}
                            </div>
                            {p.platforms.length ? (
                              <div className="mt-1 text-[11px] text-[var(--text-dim)]">
                                {t("placementPlatforms")}: {p.platforms.join(", ")}
                              </div>
                            ) : null}
                            {p.positions.length ? (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {p.positions.map((pos) => (
                                  <span
                                    key={pos}
                                    className="rounded-md bg-[var(--surface-card)] px-2 py-0.5 text-[10px] text-[var(--text-dim)] ring-1 ring-[var(--border-color)]"
                                  >
                                    {pos}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <div className="mt-1 text-[11px] text-[var(--text-dim)]">{t("placementAutomatic")}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {usage.campaigns.map((c) => (
                    <div key={c.id} className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-card)] p-3">
                      <Link
                        href={`/campaigns/${c.id}?client=${encodeURIComponent(usage.clientSlug)}`}
                        className="text-sm font-semibold text-[var(--violet)] hover:underline"
                      >
                        {c.name}
                      </Link>
                      <div className="mt-2 space-y-2">
                        {c.adsets.map((s, i) => (
                          <div key={s.id ?? i} className="rounded-lg bg-[var(--surface-bg)] p-2">
                            <Link
                              href={`/campaigns/${c.id}/adsets?client=${encodeURIComponent(usage.clientSlug)}`}
                              className="ui-link text-xs"
                            >
                              {s.name}
                            </Link>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {s.ads.map((ad) => (
                                <Link
                                  key={ad.id}
                                  href={`/campaigns/${c.id}/ads?client=${encodeURIComponent(usage.clientSlug)}`}
                                  className="rounded-md bg-[var(--surface-card)] px-2 py-0.5 text-[11px] text-[var(--text-dim)] ring-1 ring-[var(--border-color)] hover:text-[var(--violet-bright)]"
                                >
                                  {ad.name}
                                </Link>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          ) : mode === "preview" && hasAds ? (
            loading || detailLoading ? (
              <p className="py-8 text-center text-sm text-[var(--text-dim)]">{t("previewLoading")}</p>
            ) : preview && !err ? (
              <div className="mx-auto w-full" style={{ maxWidth: previewW }}>
                <iframe
                  title="ad-preview"
                  src={preview.src}
                  scrolling="yes"
                  style={{
                    width: "100%",
                    height: previewH,
                    minHeight: 480
                  }}
                  className="block border-0 bg-[var(--surface-card)]"
                />
              </div>
            ) : imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" className="mx-auto max-w-full rounded-lg object-contain" />
            ) : (
              <p className="py-8 text-center text-sm text-[var(--text-dim)]">{t("previewUnavailable")}</p>
            )
          ) : imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="mx-auto max-w-full rounded-lg object-contain" />
          ) : (
            <p className="py-8 text-center text-sm text-[var(--text-dim)]">—</p>
          )}
        </div>
      </div>
    </div>
  );
}
