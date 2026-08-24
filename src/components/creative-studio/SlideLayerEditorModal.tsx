"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Pause, Play, RotateCw, Trash2, Type, X } from "lucide-react";

import { DsModal } from "@/design-system";
import {
  COLOR_SWATCHES,
  EMOJI_PRESETS,
  FONT_OPTIONS,
  drawLayer,
  ensureFontsLoaded,
  evaluateLayerAtTime,
  layerBounds,
  loadImageFile,
  newImageLayer,
  newTextLayer,
  type BaseLayer,
  type Layer,
  type MoveInDirection,
  type TextLayer
} from "@/lib/creative-studio/canvas-layers";

const MOVE_DIRECTIONS: Array<{ v: MoveInDirection; label: string }> = [
  { v: "bottom", label: "De baixo" },
  { v: "top", label: "De cima" },
  { v: "left", label: "Da esq." },
  { v: "right", label: "Da dir." }
];

/** Duração assumida do slide só pra rodar a prévia dentro do modal — o vídeo real usa
 * a duração configurada em segundos-por-imagem na tela de Vídeo. */
const PREVIEW_DURATION_MS = 3000;

/**
 * Editor de camadas de um slide de vídeo — mesmo motor de desenho do editor de imagem
 * estática (`ImageEditorModal`/`canvas-layers`), mas NÃO achata em PNG: devolve as
 * camadas estruturadas (`onSave`) pra `video-export.ts` desenhar frame a frame com
 * animação (fade in/out, entrada deslizante) durante a gravação do vídeo/GIF.
 */
export function SlideLayerEditorModal({
  open,
  imageBase64,
  mimeType,
  initialLayers,
  onClose,
  onSave
}: {
  open: boolean;
  imageBase64: string;
  mimeType: string;
  initialLayers: Layer[];
  onClose: () => void;
  onSave: (layers: Layer[]) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const stickerInputRef = useRef<HTMLInputElement>(null);
  const [imageReady, setImageReady] = useState(false);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const dragRef = useRef<{ id: string; offsetXPct: number; offsetYPct: number } | null>(null);
  const previewRafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setImageReady(false);
    setLayers(initialLayers);
    setSelectedId(null);
    setPreviewing(false);
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setImageReady(true);
    };
    img.src = `data:${mimeType};base64,${imageBase64}`;
    ensureFontsLoaded().then(() => draw());
    return () => {
      if (previewRafRef.current) cancelAnimationFrame(previewRafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, imageBase64, mimeType]);

  const draw = useCallback(
    (atMs?: number) => {
      const canvas = canvasRef.current;
      const img = imageRef.current;
      if (!canvas || !img) return;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);

      for (const layer of layers) {
        if (atMs !== undefined) {
          const { xPct, yPct, opacity } = evaluateLayerAtTime(layer, atMs, PREVIEW_DURATION_MS);
          if (opacity <= 0) continue;
          drawLayer(ctx, canvas, layer, { xPct, yPct, opacity, selected: !previewing && layer.id === selectedId });
        } else {
          drawLayer(ctx, canvas, layer, { selected: layer.id === selectedId });
        }
      }
    },
    [layers, selectedId, previewing]
  );

  useEffect(() => {
    if (imageReady && !previewing) draw();
  }, [imageReady, draw, previewing]);

  const togglePreview = () => {
    if (previewing) {
      setPreviewing(false);
      if (previewRafRef.current) cancelAnimationFrame(previewRafRef.current);
      draw();
      return;
    }
    setPreviewing(true);
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = (now - start) % PREVIEW_DURATION_MS;
      draw(elapsed);
      previewRafRef.current = requestAnimationFrame(tick);
    };
    previewRafRef.current = requestAnimationFrame(tick);
  };

  const pointerToPct = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      xPct: ((e.clientX - rect.left) / rect.width) * 100,
      yPct: ((e.clientY - rect.top) / rect.height) * 100
    };
  };

  const hitTestLayer = (xPct: number, yPct: number): Layer | null => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return null;
    const px = (xPct / 100) * canvas.width;
    const py = (yPct / 100) * canvas.height;
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i]!;
      const b = layerBounds(canvas, ctx, layer);
      if (Math.abs(px - b.x) <= b.w / 2 + 8 && Math.abs(py - b.y) <= b.h / 2 + 8) {
        return layer;
      }
    }
    return null;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (previewing) return;
    const { xPct, yPct } = pointerToPct(e);
    const hit = hitTestLayer(xPct, yPct);
    setSelectedId(hit?.id ?? null);
    if (hit) {
      dragRef.current = { id: hit.id, offsetXPct: xPct - hit.xPct, offsetYPct: yPct - hit.yPct };
      (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current) return;
    const { xPct, yPct } = pointerToPct(e);
    const { id, offsetXPct, offsetYPct } = dragRef.current;
    setLayers((prev) =>
      prev.map((l) =>
        l.id === id
          ? {
              ...l,
              xPct: Math.min(96, Math.max(4, xPct - offsetXPct)),
              yPct: Math.min(96, Math.max(4, yPct - offsetYPct))
            }
          : l
      )
    );
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  const selected = layers.find((l) => l.id === selectedId) ?? null;

  const addTextLayer = () => {
    const layer = newTextLayer("Novo texto");
    setLayers((prev) => [...prev, layer]);
    setSelectedId(layer.id);
  };

  const addEmojiLayer = (emoji: string) => {
    const layer = newTextLayer(emoji);
    layer.strokeEnabled = false;
    layer.bgEnabled = false;
    layer.fontSize = 90;
    setLayers((prev) => [...prev, layer]);
    setSelectedId(layer.id);
  };

  const addImageLayer = async (file: File | undefined) => {
    if (!file) return;
    try {
      const img = await loadImageFile(file);
      const layer = newImageLayer(img);
      setLayers((prev) => [...prev, layer]);
      setSelectedId(layer.id);
    } catch {
      /* falha silenciosa — usuário pode tentar outro arquivo */
    }
  };

  const removeSelected = () => {
    if (!selectedId) return;
    setLayers((prev) => prev.filter((l) => l.id !== selectedId));
    setSelectedId(null);
  };

  const updateSelectedText = (patch: Partial<TextLayer>) => {
    if (!selectedId) return;
    setLayers((prev) => prev.map((l) => (l.id === selectedId && l.kind === "text" ? { ...l, ...patch } : l)));
  };

  const updateSelectedAny = (patch: Partial<BaseLayer> & { widthPct?: number }) => {
    if (!selectedId) return;
    setLayers((prev) => prev.map((l) => (l.id === selectedId ? { ...l, ...patch } : l)));
  };

  const updateSelectedAnimation = (patch: Partial<BaseLayer["animation"]>) => {
    if (!selectedId) return;
    setLayers((prev) =>
      prev.map((l) => (l.id === selectedId ? { ...l, animation: { ...l.animation, ...patch } } : l))
    );
  };

  let selectedRemoveHandlePct: { leftPct: number; topPct: number } | null = null;
  if (selected && imageReady && !previewing) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      const bounds = layerBounds(canvas, ctx, selected);
      selectedRemoveHandlePct = {
        leftPct: selected.xPct + ((bounds.w / 2) / canvas.width) * 100,
        topPct: selected.yPct - ((bounds.h / 2) / canvas.height) * 100
      };
    }
  }

  return (
    <DsModal
      open={open}
      onClose={onClose}
      title="Camadas do slide"
      subtitle="Texto/imagem sobre a foto — com animação de entrada pro vídeo"
      width="xl"
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_260px]">
        <div className="space-y-2">
          <div className="flex items-center justify-center overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--surface-bg)] p-2">
            <div className="relative inline-block">
              <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                className="max-h-[55vh] max-w-full touch-none rounded-lg"
                style={{ cursor: previewing ? "default" : dragRef.current ? "grabbing" : "grab" }}
              />
              {selectedRemoveHandlePct ? (
                <button
                  type="button"
                  onClick={removeSelected}
                  aria-label="Remover camada"
                  title="Remover camada"
                  className="absolute z-10 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-red-600 text-white shadow-md transition hover:bg-red-500"
                  style={{ left: `${selectedRemoveHandlePct.leftPct}%`, top: `${selectedRemoveHandlePct.topPct}%` }}
                >
                  <X size={12} strokeWidth={3} />
                </button>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={togglePreview}
            className="ui-btn-accent-outline inline-flex h-8 w-full items-center justify-center gap-1.5 font-body text-xs font-medium"
          >
            {previewing ? <Pause size={13} /> : <Play size={13} />}
            {previewing ? "Parar prévia" : "Prévia da animação"}
          </button>
        </div>

        <div className="max-h-[55vh] space-y-4 overflow-y-auto pr-1">
          <input
            ref={stickerInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => addImageLayer(e.target.files?.[0])}
          />
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={addTextLayer}
              className="ui-btn-accent-outline inline-flex h-8 flex-1 items-center justify-center gap-1.5 font-body text-xs font-medium"
            >
              <Type size={13} />
              Texto
            </button>
            <button
              type="button"
              onClick={() => stickerInputRef.current?.click()}
              className="ui-btn-accent-outline inline-flex h-8 flex-1 items-center justify-center gap-1.5 font-body text-xs font-medium"
            >
              <ImagePlus size={13} />
              Imagem/logo
            </button>
          </div>

          <div>
            <p className="mb-1 font-body text-[10px] text-[var(--text-dimmer)]">Emojis prontos</p>
            <div className="flex flex-wrap gap-1">
              {EMOJI_PRESETS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => addEmojiLayer(emoji)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border-color)] text-sm hover:border-[var(--ui-accent)]"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {selected ? (
            <div className="space-y-2.5 rounded-xl border border-[var(--border-color)] p-3">
              {selected.kind === "text" ? (
                <>
                  <input
                    value={selected.text}
                    onChange={(e) => updateSelectedText({ text: e.target.value })}
                    className="ui-input w-full font-body text-xs"
                    placeholder="Texto"
                  />
                  <div>
                    <p className="mb-1 font-body text-[10px] text-[var(--text-dimmer)]">Fonte</p>
                    <select
                      value={selected.fontFamily}
                      onChange={(e) => updateSelectedText({ fontFamily: e.target.value })}
                      className="ui-input h-8 w-full py-0 font-body text-xs"
                      style={{ fontFamily: selected.fontFamily }}
                    >
                      {FONT_OPTIONS.map((f) => (
                        <option key={f.family} value={f.family} style={{ fontFamily: f.family }}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-1.5">
                    {[
                      { key: "bold" as const, label: "B", active: selected.bold, className: "font-bold" },
                      { key: "italic" as const, label: "I", active: selected.italic, className: "italic" },
                      { key: "underline" as const, label: "S", active: selected.underline, className: "underline" },
                      { key: "strikethrough" as const, label: "T", active: selected.strikethrough, className: "line-through" }
                    ].map((btn) => (
                      <button
                        key={btn.key}
                        type="button"
                        onClick={() => updateSelectedText({ [btn.key]: !btn.active } as Partial<TextLayer>)}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg border font-body text-xs ${btn.className} ${
                          btn.active
                            ? "border-[var(--ui-accent)] bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]"
                            : "border-[var(--border-color)] text-[var(--text-dim)]"
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                  <div>
                    <p className="mb-1 font-body text-[10px] text-[var(--text-dimmer)]">Tamanho</p>
                    <input
                      type="range"
                      min={40}
                      max={220}
                      value={selected.fontSize}
                      onChange={(e) => updateSelectedText({ fontSize: Number(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <p className="mb-1 font-body text-[10px] text-[var(--text-dimmer)]">Cor do texto</p>
                    <div className="flex flex-wrap gap-1.5">
                      {COLOR_SWATCHES.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => updateSelectedText({ color: c })}
                          aria-label={`Cor ${c}`}
                          className={`h-6 w-6 rounded-full border-2 ${selected.color === c ? "border-[var(--ui-accent)]" : "border-[var(--border-color)]"}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                  <label className="flex items-center gap-2 font-body text-[11px] text-[var(--text-dim)]">
                    <input
                      type="checkbox"
                      checked={selected.bgEnabled}
                      onChange={(e) => updateSelectedText({ bgEnabled: e.target.checked })}
                      className="accent-[var(--ui-accent)]"
                    />
                    Caixa de fundo
                  </label>
                </>
              ) : (
                <div>
                  <p className="mb-1 font-body text-[10px] text-[var(--text-dimmer)]">Tamanho</p>
                  <input
                    type="range"
                    min={6}
                    max={70}
                    value={selected.widthPct}
                    onChange={(e) => updateSelectedAny({ widthPct: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
              )}

              <div>
                <p className="mb-1 flex items-center gap-1 font-body text-[10px] text-[var(--text-dimmer)]">
                  <RotateCw size={10} /> Rotação
                </p>
                <input
                  type="range"
                  min={-180}
                  max={180}
                  value={selected.rotation}
                  onChange={(e) => updateSelectedAny({ rotation: Number(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div>
                <p className="mb-1 flex justify-between font-body text-[10px] text-[var(--text-dimmer)]">
                  <span>Opacidade</span>
                  <span>{selected.opacity}%</span>
                </p>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={selected.opacity}
                  onChange={(e) => updateSelectedAny({ opacity: Number(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div className="space-y-2 border-t border-[var(--border-color)] pt-2.5">
                <p className="font-heading text-[10px] font-bold uppercase tracking-wide text-[var(--text-dimmer)]">
                  Animação no vídeo
                </p>

                <label className="flex items-center gap-2 font-body text-[11px] text-[var(--text-dim)]">
                  <input
                    type="checkbox"
                    checked={selected.animation.fadeIn}
                    onChange={(e) => updateSelectedAnimation({ fadeIn: e.target.checked })}
                    className="accent-[var(--ui-accent)]"
                  />
                  Fade in (aparecer suave)
                </label>
                {selected.animation.fadeIn ? (
                  <div className="pl-5">
                    <p className="flex justify-between font-body text-[10px] text-[var(--text-dimmer)]">
                      <span>Duração</span>
                      <span>{(selected.animation.fadeInMs / 1000).toFixed(1)}s</span>
                    </p>
                    <input
                      type="range"
                      min={100}
                      max={2000}
                      step={100}
                      value={selected.animation.fadeInMs}
                      onChange={(e) => updateSelectedAnimation({ fadeInMs: Number(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                ) : null}

                <label className="flex items-center gap-2 font-body text-[11px] text-[var(--text-dim)]">
                  <input
                    type="checkbox"
                    checked={selected.animation.fadeOut}
                    onChange={(e) => updateSelectedAnimation({ fadeOut: e.target.checked })}
                    className="accent-[var(--ui-accent)]"
                  />
                  Fade out (sumir suave)
                </label>
                {selected.animation.fadeOut ? (
                  <div className="pl-5">
                    <p className="flex justify-between font-body text-[10px] text-[var(--text-dimmer)]">
                      <span>Duração</span>
                      <span>{(selected.animation.fadeOutMs / 1000).toFixed(1)}s</span>
                    </p>
                    <input
                      type="range"
                      min={100}
                      max={2000}
                      step={100}
                      value={selected.animation.fadeOutMs}
                      onChange={(e) => updateSelectedAnimation({ fadeOutMs: Number(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                ) : null}

                <label className="flex items-center gap-2 font-body text-[11px] text-[var(--text-dim)]">
                  <input
                    type="checkbox"
                    checked={selected.animation.moveIn}
                    onChange={(e) => updateSelectedAnimation({ moveIn: e.target.checked })}
                    className="accent-[var(--ui-accent)]"
                  />
                  Entrada deslizante
                </label>
                {selected.animation.moveIn ? (
                  <div className="space-y-1.5 pl-5">
                    <div className="flex gap-1.5">
                      {MOVE_DIRECTIONS.map((d) => (
                        <button
                          key={d.v}
                          type="button"
                          onClick={() => updateSelectedAnimation({ moveInDirection: d.v })}
                          className={`h-7 flex-1 rounded-lg border font-body text-[10px] ${
                            selected.animation.moveInDirection === d.v
                              ? "border-[var(--ui-accent)] bg-[var(--ui-accent-muted)] text-[var(--ui-accent)] font-semibold"
                              : "border-[var(--border-color)] text-[var(--text-dim)]"
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                    <p className="font-body text-[10px] text-[var(--text-dimmer)]">Distância</p>
                    <input
                      type="range"
                      min={5}
                      max={40}
                      value={selected.animation.moveInDistancePct}
                      onChange={(e) => updateSelectedAnimation({ moveInDistancePct: Number(e.target.value) })}
                      className="w-full"
                    />
                    <p className="font-body text-[10px] leading-relaxed text-[var(--text-dimmer)]">
                      Usa a mesma duração do fade in.
                    </p>
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                onClick={removeSelected}
                className="inline-flex items-center gap-1.5 font-body text-[11px] text-red-500"
              >
                <Trash2 size={12} />
                Remover camada
              </button>
            </div>
          ) : (
            <p className="font-body text-[11px] leading-relaxed text-[var(--text-dimmer)]">
              Clica numa camada na imagem pra editar, ou adiciona texto/imagem acima.
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2 border-t border-[var(--border-color)] pt-3">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-8 items-center justify-center px-3 font-body text-xs text-[var(--text-dim)]"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => onSave(layers)}
          className="ui-btn-accent inline-flex h-8 items-center justify-center px-4 font-heading text-xs font-semibold"
        >
          Salvar camadas
        </button>
      </div>
    </DsModal>
  );
}
