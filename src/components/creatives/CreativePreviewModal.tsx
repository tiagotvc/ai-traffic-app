"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { DownloadIcon } from "@/components/ui/DownloadIcon";

const FORMATS = [
  { key: "MOBILE_FEED_STANDARD", label: "fmtMobile" },
  { key: "DESKTOP_FEED_STANDARD", label: "fmtDesktop" },
  { key: "INSTAGRAM_STANDARD", label: "fmtInstagram" },
  { key: "INSTAGRAM_STORY", label: "fmtStory" }
] as const;

type Copy = { bodies: string[]; titles: string[]; descriptions: string[]; ctas: string[] };
type Preview = { src: string; width: number | null; height: number | null };

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
  const [mode, setMode] = useState<"image" | "preview" | "copy">(adId ? "preview" : "image");
  const [format, setFormat] = useState<string>("MOBILE_FEED_STANDARD");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(false);
  const [copy, setCopy] = useState<Copy | null>(null);
  const [copyLoading, setCopyLoading] = useState(false);

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4"
      onMouseDown={onClose}
    >
      <div
        className={`flex max-h-[92vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ${panelWidth}`}
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
            <button type="button" onClick={() => setMode("copy")} className={tabClass(mode === "copy")}>
              {t("copyTab")}
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

        <div className="flex-1 overflow-auto bg-slate-100 p-3">
          <div className="flex min-h-full items-center justify-center">
            {mode === "copy" ? (
              <div className="w-full max-w-md space-y-4 self-start">
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
            ) : mode === "preview" && adId ? (
              loading ? (
                <span className="py-8 text-sm text-slate-500">{t("previewLoading")}</span>
              ) : preview && !err ? (
                <iframe
                  title="ad-preview"
                  src={preview.src}
                  scrolling="no"
                  style={{
                    width: preview.width ? `${preview.width}px` : "360px",
                    height: preview.height ? `${preview.height}px` : "640px"
                  }}
                  className="border-0 bg-white"
                />
              ) : imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="" className="max-h-[84vh] max-w-full rounded-lg object-contain" />
              ) : (
                <span className="py-8 text-sm text-slate-500">{t("previewUnavailable")}</span>
              )
            ) : imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" className="max-h-[84vh] max-w-full rounded-lg object-contain" />
            ) : (
              <span className="py-8 text-sm text-slate-500">—</span>
            )}
          </div>
        </div>

        {downloadHref ? (
          <div className="flex justify-end border-t border-slate-100 px-4 py-3">
            <a href={downloadHref} className="ui-btn-primary inline-flex items-center gap-1.5 text-sm">
              <DownloadIcon />
              {t("download")}
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}
