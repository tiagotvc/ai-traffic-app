"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser, ImagePlus, RotateCw, Trash2, Type, X } from "lucide-react";

import { DsModal } from "@/design-system";
import {
  COLOR_SWATCHES,
  EMOJI_PRESETS,
  FONT_OPTIONS,
  drawLayer,
  ensureFontsLoaded,
  layerBounds,
  loadImageFile,
  newImageLayer,
  newTextLayer,
  type BaseLayer,
  type Layer,
  type TextLayer
} from "@/lib/creative-studio/canvas-layers";
import { TextRemovalModal } from "@/components/creative-studio/TextRemovalModal";

/**
 * Editor de imagem próprio — canvas manual (arrastar, rotacionar, tipografia completa —
 * fonte/peso/itálico/sublinhado/tachado/espaçamento/alinhamento —, contorno com
 * espessura, sombra, caixa de fundo com opacidade/contorno, opacidade de camada,
 * imagem-dentro-da-imagem tipo logo/badge, emojis prontos, ajustar brilho/contraste/
 * saturação). Toda camada é composta por cima da foto — nunca algo que a IA de imagem
 * tenta desenhar sozinha (é o que causava texto ilegível antes). O motor de desenho é
 * compartilhado com o editor de vídeo (`@/lib/creative-studio/canvas-layers`) — aqui
 * a saída é sempre um PNG achatado (`apply`), sem animação.
 */
export function ImageEditorModal({
  open,
  imageBase64,
  mimeType,
  initialText,
  onClose,
  onApply
}: {
  open: boolean;
  imageBase64: string;
  mimeType: string;
  initialText?: string;
  onClose: () => void;
  onApply: (result: { base64: string; mimeType: string }) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const stickerInputRef = useRef<HTMLInputElement>(null);
  const [imageReady, setImageReady] = useState(false);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [baseImage, setBaseImage] = useState<{ base64: string; mimeType: string } | null>(null);
  const [removalOpen, setRemovalOpen] = useState(false);
  const dragRef = useRef<{ id: string; offsetXPct: number; offsetYPct: number } | null>(null);

  const loadBase = useCallback((b64: string, mt: string) => {
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setImageReady(true);
    };
    img.src = `data:${mt};base64,${b64}`;
  }, []);

  // Reabre do zero a cada imagem — não carrega estado de edição de um card pro outro.
  useEffect(() => {
    if (!open) return;
    setImageReady(false);
    setLayers(initialText ? [newTextLayer(initialText)] : []);
    setSelectedId(null);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setBaseImage({ base64: imageBase64, mimeType });
    loadBase(imageBase64, mimeType);
    ensureFontsLoaded().then(() => draw());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, imageBase64, mimeType]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
    ctx.drawImage(img, 0, 0);
    ctx.filter = "none";

    for (const layer of layers) {
      drawLayer(ctx, canvas, layer, { selected: layer.id === selectedId });
    }
  }, [layers, selectedId, brightness, contrast, saturation]);

  useEffect(() => {
    if (imageReady) draw();
  }, [imageReady, draw]);

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
    // Ignora a rotação no hit-test (aproximação — suficiente pra um editor leve com
    // poucas camadas) e testa da última pra primeira (a de cima primeiro).
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

  const apply = () => {
    draw();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    onApply({ base64: dataUrl.split(",")[1] ?? "", mimeType: "image/png" });
  };

  // Posição (em % do canvas exibido) do "x" de remover, ancorado no canto
  // superior-direito da camada selecionada — ignora rotação de propósito, igual ao
  // hit-test, é só uma alça aproximada pra dar um jeito óbvio de remover a camada.
  let selectedRemoveHandlePct: { leftPct: number; topPct: number } | null = null;
  if (selected && imageReady) {
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
    <DsModal open={open} onClose={onClose} title="Editar imagem" subtitle="Arraste as camadas pra posicionar" width="xl">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_260px]">
        <div className="flex items-center justify-center overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--surface-bg)] p-2">
          <div className="relative inline-block">
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              className="max-h-[60vh] max-w-full touch-none rounded-lg"
              style={{ cursor: dragRef.current ? "grabbing" : "grab" }}
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

        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
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

          <button
            type="button"
            onClick={() => setRemovalOpen(true)}
            disabled={!imageReady}
            className="ui-btn-accent-outline inline-flex h-8 w-full items-center justify-center gap-1.5 font-body text-xs font-medium disabled:opacity-60"
          >
            <Eraser size={13} />
            Remover texto da foto
          </button>

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

                  <div className="flex gap-1.5">
                    {(
                      [
                        { v: "left" as const, label: "Esq." },
                        { v: "center" as const, label: "Centro" },
                        { v: "right" as const, label: "Dir." }
                      ]
                    ).map((a) => (
                      <button
                        key={a.v}
                        type="button"
                        onClick={() => updateSelectedText({ align: a.v })}
                        className={`h-8 flex-1 rounded-lg border font-body text-[11px] ${
                          selected.align === a.v
                            ? "border-[var(--ui-accent)] bg-[var(--ui-accent-muted)] text-[var(--ui-accent)] font-semibold"
                            : "border-[var(--border-color)] text-[var(--text-dim)]"
                        }`}
                      >
                        {a.label}
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
                    <p className="mb-1 font-body text-[10px] text-[var(--text-dimmer)]">Espaçamento entre letras</p>
                    <input
                      type="range"
                      min={0}
                      max={20}
                      value={selected.letterSpacing}
                      onChange={(e) => updateSelectedText({ letterSpacing: Number(e.target.value) })}
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
                      checked={selected.strokeEnabled}
                      onChange={(e) => updateSelectedText({ strokeEnabled: e.target.checked })}
                      className="accent-[var(--ui-accent)]"
                    />
                    Contorno
                  </label>
                  {selected.strokeEnabled ? (
                    <div className="space-y-1.5 pl-5">
                      <div className="flex flex-wrap gap-1.5">
                        {COLOR_SWATCHES.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => updateSelectedText({ strokeColor: c })}
                            aria-label={`Contorno ${c}`}
                            className={`h-5 w-5 rounded-full border-2 ${selected.strokeColor === c ? "border-[var(--ui-accent)]" : "border-[var(--border-color)]"}`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                      <p className="font-body text-[10px] text-[var(--text-dimmer)]">Espessura do contorno</p>
                      <input
                        type="range"
                        min={1}
                        max={20}
                        value={selected.strokeWidth}
                        onChange={(e) => updateSelectedText({ strokeWidth: Number(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                  ) : null}
                  <label className="flex items-center gap-2 font-body text-[11px] text-[var(--text-dim)]">
                    <input
                      type="checkbox"
                      checked={selected.shadowEnabled}
                      onChange={(e) => updateSelectedText({ shadowEnabled: e.target.checked })}
                      className="accent-[var(--ui-accent)]"
                    />
                    Sombra
                  </label>
                  <label className="flex items-center gap-2 font-body text-[11px] text-[var(--text-dim)]">
                    <input
                      type="checkbox"
                      checked={selected.bgEnabled}
                      onChange={(e) => updateSelectedText({ bgEnabled: e.target.checked })}
                      className="accent-[var(--ui-accent)]"
                    />
                    Caixa de fundo
                  </label>
                  {selected.bgEnabled ? (
                    <div className="space-y-1.5 pl-5">
                      <div className="flex flex-wrap gap-1.5">
                        {COLOR_SWATCHES.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => updateSelectedText({ bgColor: c })}
                            aria-label={`Fundo ${c}`}
                            className={`h-5 w-5 rounded-full border-2 ${selected.bgColor === c ? "border-[var(--ui-accent)]" : "border-[var(--border-color)]"}`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                      <p className="flex justify-between font-body text-[10px] text-[var(--text-dimmer)]">
                        <span>Opacidade da caixa</span>
                        <span>{selected.bgOpacity}%</span>
                      </p>
                      <input
                        type="range"
                        min={10}
                        max={100}
                        value={selected.bgOpacity}
                        onChange={(e) => updateSelectedText({ bgOpacity: Number(e.target.value) })}
                        className="w-full"
                      />
                      <label className="flex items-center gap-2 font-body text-[11px] text-[var(--text-dim)]">
                        <input
                          type="checkbox"
                          checked={selected.bgStrokeEnabled}
                          onChange={(e) => updateSelectedText({ bgStrokeEnabled: e.target.checked })}
                          className="accent-[var(--ui-accent)]"
                        />
                        Contorno da caixa
                      </label>
                      {selected.bgStrokeEnabled ? (
                        <div className="space-y-1.5 pl-5">
                          <div className="flex flex-wrap gap-1.5">
                            {COLOR_SWATCHES.map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => updateSelectedText({ bgStrokeColor: c })}
                                aria-label={`Contorno da caixa ${c}`}
                                className={`h-5 w-5 rounded-full border-2 ${selected.bgStrokeColor === c ? "border-[var(--ui-accent)]" : "border-[var(--border-color)]"}`}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                          <p className="font-body text-[10px] text-[var(--text-dimmer)]">Espessura</p>
                          <input
                            type="range"
                            min={1}
                            max={20}
                            value={selected.bgStrokeWidth}
                            onChange={(e) => updateSelectedText({ bgStrokeWidth: Number(e.target.value) })}
                            className="w-full"
                          />
                        </div>
                      ) : null}
                    </div>
                  ) : null}
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

          <div className="space-y-2.5 border-t border-[var(--border-color)] pt-3">
            {[
              { label: "Brilho", value: brightness, set: setBrightness },
              { label: "Contraste", value: contrast, set: setContrast },
              { label: "Saturação", value: saturation, set: setSaturation }
            ].map((s) => (
              <div key={s.label}>
                <p className="mb-1 flex justify-between font-body text-[10px] text-[var(--text-dimmer)]">
                  <span>{s.label}</span>
                  <span>{s.value}%</span>
                </p>
                <input
                  type="range"
                  min={40}
                  max={160}
                  value={s.value}
                  onChange={(e) => s.set(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            ))}
          </div>
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
          onClick={apply}
          className="ui-btn-accent inline-flex h-8 items-center justify-center px-4 font-heading text-xs font-semibold"
        >
          Aplicar
        </button>
      </div>

      {removalOpen && baseImage ? (
        <TextRemovalModal
          open
          imageBase64={baseImage.base64}
          mimeType={baseImage.mimeType}
          onClose={() => setRemovalOpen(false)}
          onDone={(res) => {
            setBaseImage(res);
            loadBase(res.base64, res.mimeType);
            setRemovalOpen(false);
          }}
        />
      ) : null}
    </DsModal>
  );
}
