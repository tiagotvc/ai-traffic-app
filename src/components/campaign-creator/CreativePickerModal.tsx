"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

import type { PublishAsset } from "@/hooks/usePublishAssets";
import { MAX_CREATIVE_VIDEO_BYTES, VIDEO_UPLOAD_CHUNK_BYTES } from "@/lib/creative-upload-limits";

type ApiJson = {
  ok?: boolean;
  error?: string;
  hash?: string;
  videoId?: string;
  label?: string;
  uploadId?: string;
};

async function readApiJson(res: Response): Promise<ApiJson> {
  const text = await res.text();
  if (!text.trim()) {
    throw new Error(res.status === 413 ? "uploadRequestTooLarge" : "uploadFailed");
  }
  try {
    return JSON.parse(text) as ApiJson;
  } catch {
    if (res.status === 413 || /request entity too large/i.test(text)) {
      throw new Error("uploadRequestTooLarge");
    }
    throw new Error(text.slice(0, 160) || "uploadFailed");
  }
}

function uploadErrorMessage(t: ReturnType<typeof useTranslations>, key: string) {
  if (key === "uploadFailed" || key === "uploadRequestTooLarge" || key === "videoTooLarge") {
    return t(key);
  }
  return key;
}

type Props = {
  open: boolean;
  onClose: () => void;
  assets: PublishAsset[];
  mediaKind: "image" | "video";
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  clientSlug: string;
  adAccountId: string;
  onVariantsGenerated?: (hashes: Array<{ hash: string; label: string }>) => void;
};

export function CreativePickerModal({
  open,
  onClose,
  assets,
  mediaKind,
  selectedIds,
  onChange,
  clientSlug,
  adAccountId,
  onVariantsGenerated
}: Props) {
  const t = useTranslations("campaignCreator");
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localAssets, setLocalAssets] = useState<PublishAsset[]>([]);

  if (!open) return null;

  const libraryAssets = assets.filter((a) => (a.kind ?? "image") === mediaKind);
  const localOfKind = localAssets.filter((a) => (a.kind ?? "image") === mediaKind);
  const allAssets = [...localOfKind, ...libraryAssets];
  const selected = new Set(selectedIds);

  function toggle(id: string) {
    if (selected.has(id)) {
      onChange(selectedIds.filter((h) => h !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  async function handleImageUpload(file: File) {
    if (!clientSlug || !adAccountId) return;
    setUploading(true);
    setError(null);
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/creative-assets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientId: clientSlug,
          adAccountId,
          imageUrl: dataUrl,
          label: file.name
        })
      });
      const j = await readApiJson(res);
      if (!res.ok || !j.ok || !j.hash) throw new Error(j.error ?? "uploadFailed");
      setLocalAssets((prev) => [
        { id: j.hash!, label: file.name, url: dataUrl, kind: "image" },
        ...prev
      ]);
      onChange([...selectedIds, j.hash!]);
    } catch (e) {
      setError(uploadErrorMessage(t, e instanceof Error ? e.message : "uploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  async function handleVideoUpload(file: File) {
    if (!clientSlug || !adAccountId) return;
    if (file.size > MAX_CREATIVE_VIDEO_BYTES) {
      setError(t("videoTooLarge"));
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const totalChunks = Math.max(1, Math.ceil(file.size / VIDEO_UPLOAD_CHUNK_BYTES));

      const initRes = await fetch("/api/creative-assets/video/init", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientId: clientSlug,
          adAccountId,
          label: file.name,
          fileName: file.name,
          totalSize: file.size,
          totalChunks
        })
      });
      const init = await readApiJson(initRes);
      if (!initRes.ok || !init.ok || !init.uploadId) {
        throw new Error(init.error ?? "uploadFailed");
      }

      for (let partIndex = 0; partIndex < totalChunks; partIndex++) {
        const start = partIndex * VIDEO_UPLOAD_CHUNK_BYTES;
        const chunk = file.slice(start, start + VIDEO_UPLOAD_CHUNK_BYTES);
        const form = new FormData();
        form.append("uploadId", init.uploadId);
        form.append("partIndex", String(partIndex));
        form.append("chunk", chunk, file.name);

        const partRes = await fetch("/api/creative-assets/video/part", { method: "POST", body: form });
        const part = await readApiJson(partRes);
        if (!partRes.ok || !part.ok) throw new Error(part.error ?? "uploadFailed");
      }

      const commitRes = await fetch("/api/creative-assets/video/commit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ uploadId: init.uploadId })
      });
      const j = await readApiJson(commitRes);
      if (!commitRes.ok || !j.ok || !j.videoId) throw new Error(j.error ?? "uploadFailed");
      const previewUrl = URL.createObjectURL(file);
      setLocalAssets((prev) => [
        { id: j.videoId!, label: j.label ?? file.name, url: previewUrl, kind: "video" },
        ...prev
      ]);
      onChange([...selectedIds, j.videoId!]);
    } catch (e) {
      setError(uploadErrorMessage(t, e instanceof Error ? e.message : "uploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  async function handleUpload(file: File) {
    if (mediaKind === "video") await handleVideoUpload(file);
    else await handleImageUpload(file);
  }

  async function handleGenerateVariants() {
    const first = selectedIds[0];
    const asset = allAssets.find((a) => a.id === first);
    if (!first || !asset?.url) {
      setError(t("creativeSelectFirst"));
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/campaign-creator/generate-creative-variants", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          adAccountId,
          sourceImageHash: first,
          sourceImageUrl: asset.url,
          variantCount: 3
        })
      });
      const j = (await res.json()) as {
        ok?: boolean;
        variants?: Array<{ hash: string; label: string }>;
        message?: string;
        error?: string;
      };
      if (!j.ok) throw new Error(j.message ?? j.error ?? "aiFailed");
      const variants = j.variants ?? [];
      setLocalAssets((prev) => [
        ...variants.map((v) => ({ id: v.hash, label: v.label, url: null, kind: "image" as const })),
        ...prev
      ]);
      onChange([...selectedIds, ...variants.map((v) => v.hash)]);
      onVariantsGenerated?.(variants);
    } catch (e) {
      setError(e instanceof Error ? e.message : "aiFailed");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-[var(--surface-card)] p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-heading text-lg font-semibold text-[var(--text-main)]">{t("creativeModalTitle")}</h2>
            <p className="mt-1 text-sm text-[var(--text-dim)]">
              {mediaKind === "video" ? t("creativeModalHintVideo") : t("creativeModalHint")}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-[var(--text-dimmer)] hover:text-[var(--text-dim)]">
            ✕
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading || !clientSlug}
            className="ui-btn-secondary text-sm"
          >
            {uploading
              ? t("uploading")
              : mediaKind === "video"
                ? t("creativeUploadVideo")
                : t("creativeUpload")}
          </button>
          {mediaKind === "image" ? (
            <button
              type="button"
              onClick={() => void handleGenerateVariants()}
              disabled={generating || !selectedIds.length}
              className="ui-btn-secondary text-sm"
            >
              {generating ? t("generatingAi") : t("creativeAiVariants")}
            </button>
          ) : null}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept={mediaKind === "video" ? "video/*" : "image/*"}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleUpload(f);
            e.target.value = "";
          }}
        />

        {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {allAssets.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => toggle(a.id)}
              className={`overflow-hidden rounded-xl border-2 text-left transition ${
                selected.has(a.id) ? "border-violet-500 ring-2 ring-violet-200" : "border-[var(--border-color)]"
              }`}
            >
              <div className="aspect-square bg-[var(--surface-bg)]">
                {a.kind === "video" && a.url?.startsWith("blob:") ? (
                  <video src={a.url} className="h-full w-full object-cover" muted playsInline />
                ) : a.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.url} alt={a.label} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center px-1 text-center text-[10px] text-[var(--text-dimmer)]">
                    {a.kind === "video" ? (
                      <span className="text-lg">▶</span>
                    ) : null}
                    <span>{a.label.slice(0, 12)}</span>
                  </div>
                )}
              </div>
              <p className="truncate p-1.5 text-[10px] text-[var(--text-dim)]">{a.label}</p>
            </button>
          ))}
        </div>

        {allAssets.length === 0 ? (
          <p className="mt-4 text-center text-xs text-[var(--text-dimmer)]">
            {mediaKind === "video" ? t("creativeEmptyVideo") : t("creativeEmptyImage")}
          </p>
        ) : null}

        <p className="mt-3 text-xs text-[var(--text-dim)]">
          {mediaKind === "video"
            ? t("creativeSelectedVideos", { count: selectedIds.length })
            : t("creativeSelected", { count: selectedIds.length })}
        </p>

        <div className="mt-4 flex justify-end">
          <button type="button" onClick={onClose} className="ui-btn-primary text-sm">
            {t("creativeDone")}
          </button>
        </div>
      </div>
    </div>
  );
}
