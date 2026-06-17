"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

import type { PublishAsset } from "@/hooks/usePublishAssets";

type Props = {
  open: boolean;
  onClose: () => void;
  assets: PublishAsset[];
  selectedHashes: string[];
  onChange: (hashes: string[]) => void;
  clientSlug: string;
  adAccountId: string;
  onVariantsGenerated?: (hashes: Array<{ hash: string; label: string }>) => void;
};

export function CreativePickerModal({
  open,
  onClose,
  assets,
  selectedHashes,
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

  const allAssets = [...assets, ...localAssets];
  const selected = new Set(selectedHashes);

  function toggle(hash: string) {
    if (selected.has(hash)) {
      onChange(selectedHashes.filter((h) => h !== hash));
    } else {
      onChange([...selectedHashes, hash]);
    }
  }

  async function handleUpload(file: File) {
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
      const j = (await res.json()) as { ok?: boolean; hash?: string; error?: string };
      if (!j.ok || !j.hash) throw new Error(j.error ?? "uploadFailed");
      setLocalAssets((prev) => [...prev, { id: j.hash!, label: file.name, url: dataUrl }]);
      onChange([...selectedHashes, j.hash!]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "uploadFailed");
    } finally {
      setUploading(false);
    }
  }

  async function handleGenerateVariants() {
    const first = selectedHashes[0];
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
        ...prev,
        ...variants.map((v) => ({ id: v.hash, label: v.label, url: null }))
      ]);
      onChange([...selectedHashes, ...variants.map((v) => v.hash)]);
      onVariantsGenerated?.(variants);
    } catch (e) {
      setError(e instanceof Error ? e.message : "aiFailed");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{t("creativeModalTitle")}</h2>
            <p className="mt-1 text-sm text-slate-500">{t("creativeModalHint")}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
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
            {uploading ? t("uploading") : t("creativeUpload")}
          </button>
          <button
            type="button"
            onClick={() => void handleGenerateVariants()}
            disabled={generating || !selectedHashes.length}
            className="ui-btn-secondary text-sm"
          >
            {generating ? t("generatingAi") : t("creativeAiVariants")}
          </button>
          <span className="self-center text-[11px] text-slate-400">{t("videoSoon")}</span>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleUpload(f);
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
                selected.has(a.id) ? "border-violet-500 ring-2 ring-violet-200" : "border-slate-200"
              }`}
            >
              <div className="aspect-square bg-slate-100">
                {a.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.url} alt={a.label} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-[10px] text-slate-400">
                    {a.label.slice(0, 12)}
                  </div>
                )}
              </div>
              <p className="truncate p-1.5 text-[10px] text-slate-600">{a.label}</p>
            </button>
          ))}
        </div>

        <p className="mt-3 text-xs text-slate-500">
          {t("creativeSelected", { count: selectedHashes.length })}
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
