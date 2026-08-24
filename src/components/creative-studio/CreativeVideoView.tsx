"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Clapperboard, Download, ExternalLink, Facebook, Film, ImageIcon, Loader2, Pencil } from "lucide-react";

import { AppPageShell } from "@/components/layout/AppPageShell";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { Link } from "@/i18n/navigation";
import { useCommandStripOptional } from "@/components/layout/CommandStripContext";
import { generateSlideshowGif, generateSlideshowMp4, type ExportProgress } from "@/lib/creative-studio/video-export";
import { SlideLayerEditorModal } from "@/components/creative-studio/SlideLayerEditorModal";
import { AccountImagePickerModal } from "@/components/creative-studio/AccountImagePickerModal";
import type { Layer } from "@/lib/creative-studio/canvas-layers";

type LibraryItem = {
  id: string;
  headline: string;
  body: string;
  mimeType: string;
  imageBase64: string;
};

type Phase = "idle" | "working" | "done";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Falha ao processar arquivo"));
    reader.readAsDataURL(blob);
  });
}

/**
 * Slideshow (MP4 pra campanha real, ou GIF pra baixar/postar orgânico) montado a partir de
 * imagens já geradas — 100% no navegador (canvas + MediaRecorder + ffmpeg.wasm), sem
 * servidor de vídeo. GIF nunca vai pra Meta (não é formato de anúncio aceito), só download.
 */
export function CreativeVideoView() {
  const strip = useCommandStripOptional();
  const targetClientId = strip?.clientFilter || strip?.clientOptions[0]?.slug || "";

  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [secondsPerFrame, setSecondsPerFrame] = useState(2.5);
  const [layersByItemId, setLayersByItemId] = useState<Record<string, Layer[]>>({});
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [accountPickerOpen, setAccountPickerOpen] = useState(false);
  const [importingFromAccount, setImportingFromAccount] = useState(false);

  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState<ExportProgress | { phase: "gif"; pct: number } | null>(null);
  const [resultKind, setResultKind] = useState<"mp4" | "gif" | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const resultBlobRef = useRef<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [committing, setCommitting] = useState(false);
  const [lastDraftId, setLastDraftId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/creative-library?scope=mine")
      .then((r) => r.json())
      .then((j: { ok?: boolean; items?: LibraryItem[] }) => setItems(j.items ?? []))
      .catch(() => {})
      .finally(() => setLoadingItems(false));
  }, []);

  useEffect(() => {
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [resultUrl]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  };

  const selectedFrames = selectedIds
    .map((id) => items.find((i) => i.id === id))
    .filter((i): i is LibraryItem => Boolean(i))
    .map((i) => ({ imageBase64: i.imageBase64, mimeType: i.mimeType, layers: layersByItemId[i.id] }));

  const resetResult = () => {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);
    resultBlobRef.current = null;
    setResultKind(null);
    setLastDraftId(null);
  };

  const generate = async (kind: "mp4" | "gif") => {
    if (selectedFrames.length < 2) {
      setError("Escolhe pelo menos 2 imagens.");
      return;
    }
    setError(null);
    resetResult();
    setPhase("working");
    try {
      const blob =
        kind === "mp4"
          ? await generateSlideshowMp4({
              frames: selectedFrames,
              secondsPerFrame,
              onProgress: (p) => setProgress(p)
            })
          : await generateSlideshowGif({
              frames: selectedFrames,
              secondsPerFrame,
              onProgress: (pct) => setProgress({ phase: "gif", pct })
            });
      resultBlobRef.current = blob;
      setResultUrl(URL.createObjectURL(blob));
      setResultKind(kind);
      setPhase("done");
    } catch {
      setError("Não foi possível gerar agora — tenta com menos imagens ou de novo.");
      setPhase("idle");
    }
  };

  const download = () => {
    if (!resultUrl || !resultKind) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = resultKind === "mp4" ? "criativo.mp4" : "criativo.gif";
    a.click();
  };

  const useInClient = async () => {
    if (!resultBlobRef.current || !targetClientId) {
      setError("Escolhe um cliente em \"Mostrar filtros\" primeiro.");
      return;
    }
    setCommitting(true);
    setError(null);
    try {
      const videoBase64 = await blobToBase64(resultBlobRef.current);
      const headline = selectedIds
        .map((id) => items.find((i) => i.id === id)?.headline)
        .find(Boolean) ?? "";
      const res = await fetch("/api/creative-video/commit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clientSlug: targetClientId, videoBase64, headline, locale: "pt-BR" })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error();
      setLastDraftId(json.draftId);
    } catch {
      setError("Não foi possível enviar o vídeo pra Meta agora.");
    } finally {
      setCommitting(false);
    }
  };

  const importFromAccount = async (img: { base64: string; mimeType: string; label: string }) => {
    setImportingFromAccount(true);
    setError(null);
    try {
      const res = await fetch("/api/creative-library/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageBase64: img.base64, mimeType: img.mimeType, headline: img.label })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error();
      const newItem: LibraryItem = { id: json.id, headline: img.label, body: "", mimeType: img.mimeType, imageBase64: img.base64 };
      setItems((prev) => [newItem, ...prev]);
      setSelectedIds((prev) => (prev.length >= 4 ? prev : [...prev, newItem.id]));
    } catch {
      setError("Não foi possível importar essa imagem agora.");
    } finally {
      setImportingFromAccount(false);
      setAccountPickerOpen(false);
    }
  };

  const progressLabel = () => {
    if (!progress) return "Gerando…";
    if (progress.phase === "recording") return `Montando o vídeo… ${progress.pct}%`;
    if (progress.phase === "converting") return `Convertendo pra MP4… ${progress.pct}%`;
    if (progress.phase === "gif") return `Gerando GIF… ${progress.pct}%`;
    return "Gerando…";
  };

  return (
    <AppPageShell as="main" gap="loose" className="flex-1 overflow-y-auto">
      <div className="space-y-6">
        <PageToolbar
          eyebrow="Estúdio Criativo"
          icon={<Clapperboard size={16} />}
          title="Vídeo"
          subtitle="Monta um slideshow com as imagens do seu histórico — MP4 pronto pra campanha ou GIF pra baixar."
          showAccountFilter={false}
          showSync={false}
        />

        <button
          type="button"
          onClick={() => setAccountPickerOpen(true)}
          disabled={!targetClientId || importingFromAccount}
          className="ui-btn-accent-outline inline-flex h-8 w-fit items-center justify-center gap-1.5 font-body text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
        >
          {importingFromAccount ? <Loader2 size={13} className="animate-spin" /> : <Facebook size={13} />}
          Importar da conta
        </button>

        {loadingItems ? (
          <div className="flex items-center gap-2 font-body text-xs text-[var(--text-dim)]">
            <Loader2 size={14} className="animate-spin" />
            Carregando histórico…
          </div>
        ) : items.length < 2 ? (
          <p className="font-body text-xs text-[var(--text-dim)]">
            Precisa de pelo menos 2 imagens — gera algumas no Estúdio Criativo ou importa da conta acima.
          </p>
        ) : (
          <>
            <div>
              <p className="mb-2 font-heading text-[11px] font-bold uppercase tracking-wide text-[var(--text-dimmer)]">
                Escolhe de 2 a 4 imagens (na ordem que quer que apareçam)
              </p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                {items.map((item) => {
                  const order = selectedIds.indexOf(item.id);
                  const selected = order >= 0;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleSelect(item.id)}
                      className={`relative aspect-square overflow-hidden rounded-lg border-2 ${selected ? "border-[var(--ui-accent)]" : "border-transparent"}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`data:${item.mimeType};base64,${item.imageBase64}`}
                        alt={item.headline}
                        className="h-full w-full object-cover"
                      />
                      {selected ? (
                        <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--ui-accent)] font-body text-[10px] font-bold text-white">
                          {order + 1}
                        </span>
                      ) : null}
                      {selected ? (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingItemId(item.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.stopPropagation();
                              setEditingItemId(item.id);
                            }
                          }}
                          aria-label="Editar camadas do slide"
                          title="Editar camadas (texto/imagem/animação)"
                          className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black/90"
                        >
                          <Pencil size={11} />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="campaign-creator-card max-w-sm space-y-3 p-4">
              <div>
                <p className="mb-1 flex justify-between font-body text-[10px] text-[var(--text-dimmer)]">
                  <span>Segundos por imagem</span>
                  <span>{secondsPerFrame.toFixed(1)}s</span>
                </p>
                <input
                  type="range"
                  min={1.5}
                  max={4}
                  step={0.5}
                  value={secondsPerFrame}
                  onChange={(e) => setSecondsPerFrame(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              {error ? <p className="font-body text-xs text-red-500">{error}</p> : null}

              {phase === "working" ? (
                <div className="flex items-center gap-2 font-body text-xs text-[var(--text-dim)]">
                  <Loader2 size={14} className="animate-spin" />
                  {progressLabel()}
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => generate("mp4")}
                    disabled={selectedFrames.length < 2}
                    className="ui-btn-accent inline-flex h-9 flex-1 items-center justify-center gap-1.5 font-body text-xs font-semibold disabled:opacity-60"
                  >
                    <Film size={14} />
                    Gerar vídeo
                  </button>
                  <button
                    type="button"
                    onClick={() => generate("gif")}
                    disabled={selectedFrames.length < 2}
                    className="ui-btn-accent-outline inline-flex h-9 flex-1 items-center justify-center gap-1.5 font-body text-xs font-medium disabled:opacity-60"
                  >
                    <ImageIcon size={14} />
                    Gerar GIF
                  </button>
                </div>
              )}
            </div>

            {phase === "done" && resultUrl ? (
              <div className="campaign-creator-card max-w-sm space-y-3 p-4">
                <div className="overflow-hidden rounded-xl border border-[var(--border-color)]">
                  {resultKind === "mp4" ? (
                    <video src={resultUrl} controls className="w-full" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={resultUrl} alt="GIF gerado" className="w-full" />
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={download}
                    className="ui-btn-accent-outline inline-flex h-9 flex-1 items-center justify-center gap-1.5 font-body text-xs font-medium"
                  >
                    <Download size={14} />
                    Baixar
                  </button>
                  {resultKind === "mp4" ? (
                    lastDraftId ? (
                      <span className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-500/10 font-body text-xs font-semibold text-emerald-600">
                        <Check size={14} /> Rascunho pronto
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={useInClient}
                        disabled={committing}
                        className="ui-btn-accent inline-flex h-9 flex-1 items-center justify-center gap-1.5 font-body text-xs font-semibold disabled:opacity-60"
                      >
                        {committing ? <Loader2 size={14} className="animate-spin" /> : null}
                        Usar neste cliente
                      </button>
                    )
                  ) : null}
                </div>
                {lastDraftId ? (
                  <Link
                    href={`/campaigns/new/${lastDraftId}?active=ad`}
                    className="ui-btn-accent inline-flex h-9 w-full items-center justify-center gap-1.5 font-heading text-xs font-semibold"
                  >
                    Abrir Criador de Anúncio
                    <ExternalLink size={13} />
                  </Link>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </div>

      {editingItemId ? (
        (() => {
          const editingItem = items.find((i) => i.id === editingItemId);
          if (!editingItem) return null;
          return (
            <SlideLayerEditorModal
              open
              imageBase64={editingItem.imageBase64}
              mimeType={editingItem.mimeType}
              initialLayers={layersByItemId[editingItem.id] ?? []}
              onClose={() => setEditingItemId(null)}
              onSave={(layers) => {
                setLayersByItemId((prev) => ({ ...prev, [editingItem.id]: layers }));
                setEditingItemId(null);
              }}
            />
          );
        })()
      ) : null}

      {accountPickerOpen && targetClientId ? (
        <AccountImagePickerModal
          open
          clientId={targetClientId}
          onClose={() => setAccountPickerOpen(false)}
          onPick={importFromAccount}
        />
      ) : null}
    </AppPageShell>
  );
}
