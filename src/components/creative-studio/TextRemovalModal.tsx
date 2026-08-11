"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Eraser, Loader2, ScanText } from "lucide-react";

import { DsModal } from "@/design-system";
import { detectTextRegions, removeTextRegions, type TextRegion } from "@/lib/creative-studio/text-removal";

type Phase = "detecting" | "review" | "removing" | "done" | "error";

/**
 * Remoção de texto — 100% nossa, sem vendor de edição de imagem: OCR (Tesseract.js)
 * detecta as linhas de texto, o usuário confirma quais remover, e o preenchimento é
 * feito por difusão de pixels vizinhos (algoritmo determinístico, não generativo). Ver
 * `@/lib/creative-studio/text-removal` pros detalhes de cada etapa.
 */
export function TextRemovalModal({
  open,
  imageBase64,
  mimeType,
  onClose,
  onDone
}: {
  open: boolean;
  imageBase64: string;
  mimeType: string;
  onClose: () => void;
  onDone: (result: { base64: string; mimeType: string }) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [phase, setPhase] = useState<Phase>("detecting");
  const [regions, setRegions] = useState<TextRegion[]>([]);
  const [resultBase64, setResultBase64] = useState<string | null>(null);

  const drawClean = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);
  }, []);

  const draw = useCallback(() => {
    drawClean();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || phase !== "review") return;
    for (const r of regions) {
      const x0 = ((r.xPct - r.wPct / 2) / 100) * canvas.width;
      const y0 = ((r.yPct - r.hPct / 2) / 100) * canvas.height;
      const w = (r.wPct / 100) * canvas.width;
      const h = (r.hPct / 100) * canvas.height;
      ctx.save();
      ctx.lineWidth = Math.max(2, canvas.width * 0.0025);
      if (r.enabled) {
        ctx.strokeStyle = "#dc2626";
        ctx.fillStyle = "rgba(220,38,38,0.2)";
        ctx.fillRect(x0, y0, w, h);
      } else {
        ctx.strokeStyle = "#94a3b8";
        ctx.setLineDash([6, 5]);
      }
      ctx.strokeRect(x0, y0, w, h);
      ctx.restore();
    }
  }, [drawClean, phase, regions]);

  useEffect(() => {
    if (!open) return;
    setPhase("detecting");
    setRegions([]);
    setResultBase64(null);
    const img = new Image();
    img.onload = async () => {
      imageRef.current = img;
      drawClean();
      try {
        const found = await detectTextRegions(img);
        setRegions(found);
        setPhase("review");
      } catch {
        setPhase("error");
      }
    };
    img.src = `data:${mimeType};base64,${imageBase64}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, imageBase64, mimeType]);

  useEffect(() => {
    if (phase === "review" || phase === "done") draw();
  }, [phase, draw]);

  const toggleAt = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (phase !== "review") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    const hit = [...regions].reverse().find(
      (r) =>
        xPct >= r.xPct - r.wPct / 2 &&
        xPct <= r.xPct + r.wPct / 2 &&
        yPct >= r.yPct - r.hPct / 2 &&
        yPct <= r.yPct + r.hPct / 2
    );
    if (!hit) return;
    setRegions((prev) => prev.map((r) => (r.id === hit.id ? { ...r, enabled: !r.enabled } : r)));
  };

  const selectedCount = regions.filter((r) => r.enabled).length;

  const runRemoval = () => {
    setPhase("removing");
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) {
        setPhase("review");
        return;
      }
      drawClean();
      removeTextRegions(canvas, regions);
      const dataUrl = canvas.toDataURL("image/png");
      setResultBase64(dataUrl.split(",")[1] ?? "");
      setPhase("done");
    }, 30);
  };

  const discard = () => {
    setResultBase64(null);
    setPhase("review");
  };

  return (
    <DsModal
      open={open}
      onClose={onClose}
      title="Remover texto da imagem"
      subtitle="Detecção automática — clica numa caixa pra incluir/excluir antes de remover"
      width="xl"
    >
      <div className="space-y-3">
        <div className="flex items-center justify-center overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--surface-bg)] p-2">
          <canvas
            ref={canvasRef}
            onPointerDown={toggleAt}
            className="max-h-[55vh] max-w-full rounded-lg"
            style={{ cursor: phase === "review" ? "pointer" : "default" }}
          />
        </div>

        {phase === "detecting" ? (
          <div className="flex items-center justify-center gap-2 py-2 font-body text-xs text-[var(--text-dim)]">
            <Loader2 size={14} className="animate-spin" />
            Detectando texto na imagem…
          </div>
        ) : null}

        {phase === "error" ? (
          <p className="font-body text-xs text-red-500">
            Não foi possível detectar texto agora — tenta de novo em alguns segundos.
          </p>
        ) : null}

        {phase === "review" ? (
          regions.length === 0 ? (
            <p className="font-body text-xs text-[var(--text-dim)]">Nenhum texto detectado nessa imagem.</p>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <p className="font-body text-xs text-[var(--text-dim)]">
                {selectedCount} de {regions.length} {regions.length === 1 ? "trecho marcado" : "trechos marcados"} pra remover
              </p>
              <div className="flex items-center gap-1 font-body text-[10px] text-[var(--text-dimmer)]">
                <ScanText size={12} />
                Clica numa caixa pra incluir/excluir
              </div>
            </div>
          )
        ) : null}

        {phase === "removing" ? (
          <div className="flex items-center justify-center gap-2 py-2 font-body text-xs text-[var(--text-dim)]">
            <Loader2 size={14} className="animate-spin" />
            Removendo…
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex justify-end gap-2 border-t border-[var(--border-color)] pt-3">
        {phase === "done" ? (
          <>
            <button
              type="button"
              onClick={discard}
              className="inline-flex h-8 items-center justify-center px-3 font-body text-xs text-[var(--text-dim)]"
            >
              Tentar de novo
            </button>
            <button
              type="button"
              onClick={() => resultBase64 && onDone({ base64: resultBase64, mimeType: "image/png" })}
              className="ui-btn-accent inline-flex h-8 items-center justify-center gap-1.5 px-4 font-heading text-xs font-semibold"
            >
              <Check size={13} />
              Usar essa imagem
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 items-center justify-center px-3 font-body text-xs text-[var(--text-dim)]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={runRemoval}
              disabled={phase !== "review" || selectedCount === 0}
              className="ui-btn-accent inline-flex h-8 items-center justify-center gap-1.5 px-4 font-heading text-xs font-semibold disabled:opacity-60"
            >
              <Eraser size={13} />
              Remover selecionado
            </button>
          </>
        )}
      </div>
    </DsModal>
  );
}
