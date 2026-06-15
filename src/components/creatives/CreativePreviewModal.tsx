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
type Preview = { src: string; width: number | null; height: number | null };
type AdItem = { id: string; name: string; status: string | null };
type Adset = { id: string | null; name: string; ads: AdItem[] };
type Campaign = { id: string; name: string; adsets: Adset[] };
type Usage = { campaigns: Campaign[]; clientSlug: string };

export function CreativePreviewModal({
  adId,
  imageUrl,
  name,
  onClose
}: {
  adId: string | null;
  imageUrl: string | null;
  name: string;
  onClose: () => void;
}) {
  const t = useTranslations("creativesPerf");
  const [mode, setMode] = useState<"image" | "preview" | "copy" | "usage">(
    adId ? "preview" : "image"
  );
  const [format, setFormat] = useState<string>("MOBILE_FEED_STANDARD");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(false);
  const [copy, setCopy] = useState<Copy | null>(null);
  const [copyLoading, setCopyLoading] = useState(false);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!adId || mode !== "preview") return;
    let cancelled = false;
    setLoading(true);
    setErr(false);
    setPreview(null);
    fetch(`/api/ads/${encodeURIComponent(adId)}/preview?format=${format}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j.ok && j.src) setPreview({ src: j.src, width: j.width, height: j.height });
        else setErr(true);
      })
      .catch(() => {
        if (!cancelled) setErr(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [adId, format, mode]);

  useEffect(() => {
    if (!adId || mode !== "copy" || copy) return;
    let cancelled = false;
    setCopyLoading(true);
    fetch(`/api/ads/${encodeURIComponent(adId)}/copy`)
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled && j.ok) setCopy(j.copy as Copy);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setCopyLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [adId, mode, copy]);

  useEffect(() => {
    if (!adId || mode !== "usage" || usage) return;
    let cancelled = false;
    setUsageLoading(true);
    fetch(`/api/ads/${encodeURIComponent(adId)}/usage`)
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled && j.ok) setUsage({ campaigns: j.campaigns ?? [], clientSlug: j.clientSlug ?? "" });
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setUsageLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [adId, mode, usage]);

  const tabClass = (active: boolean) =>
    `rounded-lg px-2.5 py-1 text-xs font-medium ${
      active ? "bg-violet-100 text-violet-700" : "text-slate-500 hover:bg-slate-50"
    }`;

  const isCopyEmpty =
    copy &&
    !copy.bodies.length &&
    !copy.titles.length &&
    !copy.descriptions.length &&
    !copy.ctas.length;

  const panelWidth = mode === "image" ? "max-w-5xl" : mode === "preview" ? "max-w-3xl" : "max-w-md";

  function CopyBlock({ label, items }: { label: string; items: string[] }) {
    if (!items.length) return null;
    return (
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
        <div className="mt-1 space-y-1.5">
          {items.map((txt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => navigator.clipboard?.writeText(txt)}
              title={t("copied")}
              className="block w-full whitespace-pre-wrap rounded-lg bg-slate-50 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
            >
              {txt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const previewW = preview?.width ?? 360;
  const previewH = preview?.height ?? 640;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/80 p-4 sm:items-center"
      onMouseDown={onClose}
    >
      <div
        className={`my-auto flex max-h-[92vh] w-full flex-col rounded-2xl bg-white shadow-2xl ${panelWidth}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <div className="min-w-0 truncate text-sm font-semibold text-slate-800">{name}</div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="close"
          >
            ✕
          </button>
        </div>

        {adId ? (
          <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-slate-100 px-4 py-2">
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

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-100 p-3">
          {mode === "copy" ? (
            <div className="mx-auto w-full max-w-md space-y-4">
              {copyLoading ? (
                <p className="py-8 text-center text-sm text-slate-500">{t("copyLoading")}</p>
              ) : isCopyEmpty || !copy ? (
                <p className="py-8 text-center text-sm text-slate-500">{t("copyEmpty")}</p>
              ) : (
                <>
                  <CopyBlock label={t("copyTitles")} items={copy.titles} />
                  <CopyBlock label={t("copyBodies")} items={copy.bodies} />
                  <CopyBlock label={t("copyDescriptions")} items={copy.descriptions} />
                  <CopyBlock label={t("copyCtas")} items={copy.ctas} />
                </>
              )}
            </div>
          ) : mode === "usage" ? (
            <div className="mx-auto w-full max-w-md space-y-3">
              {usageLoading ? (
                <p className="py-8 text-center text-sm text-slate-500">{t("copyLoading")}</p>
              ) : !usage || !usage.campaigns.length ? (
                <p className="py-8 text-center text-sm text-slate-500">{t("usageEmpty")}</p>
              ) : (
                usage.campaigns.map((c) => (
                  <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-3">
                    <Link
                      href={`/campaigns/${c.id}?client=${encodeURIComponent(usage.clientSlug)}`}
                      className="text-sm font-semibold text-violet-700 hover:underline"
                    >
                      {c.name}
                    </Link>
                    <div className="mt-2 space-y-2">
                      {c.adsets.map((s, i) => (
                        <div key={s.id ?? i} className="rounded-lg bg-slate-50 p-2">
                          <Link
                            href={`/campaigns/${c.id}/adsets?client=${encodeURIComponent(usage.clientSlug)}`}
                            className="text-xs font-medium text-slate-700 hover:text-violet-700 hover:underline"
                          >
                            {s.name}
                          </Link>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {s.ads.map((ad) => (
                              <Link
                                key={ad.id}
                                href={`/campaigns/${c.id}/ads?client=${encodeURIComponent(usage.clientSlug)}`}
                                className="rounded-md bg-white px-2 py-0.5 text-[11px] text-slate-600 ring-1 ring-slate-200 hover:text-violet-700"
                              >
                                {ad.name}
                              </Link>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : mode === "preview" && adId ? (
            loading ? (
              <p className="py-8 text-center text-sm text-slate-500">{t("previewLoading")}</p>
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
                  className="block border-0 bg-white"
                />
              </div>
            ) : imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" className="mx-auto max-w-full rounded-lg object-contain" />
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">{t("previewUnavailable")}</p>
            )
          ) : imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="mx-auto max-w-full rounded-lg object-contain" />
          ) : (
            <p className="py-8 text-center text-sm text-slate-500">—</p>
          )}
        </div>
      </div>
    </div>
  );
}
