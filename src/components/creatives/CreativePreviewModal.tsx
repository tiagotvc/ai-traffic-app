"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

const FORMATS = [
  { key: "MOBILE_FEED_STANDARD", label: "fmtMobile" },
  { key: "DESKTOP_FEED_STANDARD", label: "fmtDesktop" },
  { key: "INSTAGRAM_STANDARD", label: "fmtInstagram" },
  { key: "INSTAGRAM_STORY", label: "fmtStory" }
] as const;

export function CreativePreviewModal({
  adId,
  imageUrl,
  name,
  downloadHref,
  onClose
}: {
  adId: string | null;
  imageUrl: string | null;
  name: string;
  downloadHref: string | null;
  onClose: () => void;
}) {
  const t = useTranslations("creativesPerf");
  const [mode, setMode] = useState<"preview" | "image">(adId ? "preview" : "image");
  const [format, setFormat] = useState<string>("MOBILE_FEED_STANDARD");
  const [src, setSrc] = useState<string | null>(null);
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
    if (!adId || mode !== "preview") return;
    let cancelled = false;
    setLoading(true);
    setErr(false);
    setSrc(null);
    fetch(`/api/ads/${encodeURIComponent(adId)}/preview?format=${format}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j.ok && j.src) setSrc(j.src);
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

  const tabClass = (active: boolean) =>
    `rounded-lg px-2.5 py-1 text-xs font-medium ${
      active ? "bg-violet-100 text-violet-700" : "text-slate-500 hover:bg-slate-50"
    }`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4"
      onMouseDown={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
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
          <div className="flex flex-wrap items-center gap-1 border-b border-slate-100 px-4 py-2">
            <button type="button" onClick={() => setMode("preview")} className={tabClass(mode === "preview")}>
              {t("fmtAd")}
            </button>
            <button type="button" onClick={() => setMode("image")} className={tabClass(mode === "image")}>
              {t("fmtImage")}
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

        <div className="flex min-h-[300px] flex-1 items-center justify-center overflow-auto bg-slate-100 p-3">
          {mode === "preview" && adId ? (
            loading ? (
              <span className="text-sm text-slate-500">{t("previewLoading")}</span>
            ) : src && !err ? (
              <iframe
                title="ad-preview"
                src={src}
                scrolling="no"
                className="h-[600px] w-[360px] max-w-full border-0 bg-white"
              />
            ) : imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" className="max-h-[78vh] max-w-full rounded-lg object-contain" />
            ) : (
              <span className="text-sm text-slate-500">{t("previewUnavailable")}</span>
            )
          ) : imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="max-h-[78vh] max-w-full rounded-lg object-contain" />
          ) : (
            <span className="text-sm text-slate-500">—</span>
          )}
        </div>

        {downloadHref ? (
          <div className="flex justify-end border-t border-slate-100 px-4 py-3">
            <a href={downloadHref} className="ui-btn-primary text-sm">
              ⬇ {t("download")}
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}
