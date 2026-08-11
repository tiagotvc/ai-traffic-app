"use client";

/**
 * Remoção de texto 100% nossa — sem mandar a imagem pra nenhuma API de edição de
 * terceiro. Duas etapas independentes, as duas rodando no navegador:
 *
 * 1. Detecção: OCR client-side (Tesseract.js, WASM) acha ONDE tem texto — devolve
 *    caixas por linha.
 * 2. Remoção: inpainting por Fast Marching Method (algoritmo de Telea, o mesmo que o
 *    OpenCV usa em `cv.inpaint`/`INPAINT_TELEA`, e a base do Content-Aware Fill do
 *    Photoshop) — reimplementado aqui em TS puro, sem lib nova. A frente de
 *    preenchimento avança da borda da região pra dentro, e cada pixel novo é uma média
 *    dos vizinhos já conhecidos ponderada por distância, direção da borda e "nível" da
 *    frente — bem melhor que uma média cega porque preserva linhas/bordas que atravessam
 *    a área removida em vez de só borrar tudo.
 */

export type TextRegion = {
  id: string;
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  text: string;
  enabled: boolean;
};

let ocrWorkerPromise: Promise<import("tesseract.js").Worker> | null = null;

async function getOcrWorker() {
  if (!ocrWorkerPromise) {
    const { createWorker } = await import("tesseract.js");
    ocrWorkerPromise = createWorker(["por", "eng"]);
  }
  return ocrWorkerPromise;
}

/** Detecta linhas de texto na imagem e devolve as caixas em % (independente de
 * resolução) — cada linha vira uma região que o usuário pode confirmar/descartar antes
 * de remover. */
export async function detectTextRegions(img: HTMLImageElement): Promise<TextRegion[]> {
  const worker = await getOcrWorker();
  const { data } = await worker.recognize(img, {}, { blocks: true });
  const lines = (data.blocks ?? [])
    .flatMap((block) => block.paragraphs)
    .flatMap((para) => para.lines)
    .filter((l) => l.text.trim().length > 0 && l.confidence > 40);

  return lines.map((line, i) => {
    const { x0, y0, x1, y1 } = line.bbox;
    return {
      id: `line-${i}`,
      xPct: ((x0 + x1) / 2 / img.naturalWidth) * 100,
      yPct: ((y0 + y1) / 2 / img.naturalHeight) * 100,
      wPct: ((x1 - x0) / img.naturalWidth) * 100,
      hPct: ((y1 - y0) / img.naturalHeight) * 100,
      text: line.text.trim(),
      enabled: true
    };
  });
}

const KNOWN = 0;
const BAND = 1;
const INSIDE = 2;
const INF = 1e6;

/** Fila de prioridade mínima (heap binário) por valor `t` — a "frente de avanço" do FMM
 * sempre processa o pixel mais próximo da borda conhecida primeiro. */
class MinHeap {
  private items: Array<{ t: number; x: number; y: number }> = [];

  push(t: number, x: number, y: number) {
    this.items.push({ t, x, y });
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.items[parent]!.t <= this.items[i]!.t) break;
      [this.items[parent], this.items[i]] = [this.items[i]!, this.items[parent]!];
      i = parent;
    }
  }

  pop(): { t: number; x: number; y: number } | undefined {
    if (this.items.length === 0) return undefined;
    const top = this.items[0]!;
    const last = this.items.pop()!;
    if (this.items.length > 0) {
      this.items[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = i * 2 + 2;
        let smallest = i;
        if (l < this.items.length && this.items[l]!.t < this.items[smallest]!.t) smallest = l;
        if (r < this.items.length && this.items[r]!.t < this.items[smallest]!.t) smallest = r;
        if (smallest === i) break;
        [this.items[smallest], this.items[i]] = [this.items[i]!, this.items[smallest]!];
        i = smallest;
      }
    }
    return top;
  }

  get size() {
    return this.items.length;
  }
}

/** Resolve a equação eikonal (|∇T|=1) num ponto a partir de dois vizinhos ortogonais já
 * conhecidos (um no eixo X, um no eixo Y) — é a mesma formulação usada no algoritmo de
 * Telea/OpenCV: combina os dois num "upwind" 2D quando os dois existem, cai pra 1D
 * quando só um existe. */
function solveEikonal(tX: number, hasX: boolean, tY: number, hasY: boolean): number {
  if (hasX && hasY) {
    const d = 2 - (tX - tY) * (tX - tY);
    if (d >= 0) {
      const r = Math.sqrt(d);
      const sol = (tX + tY + r) / 2;
      if (sol >= tX && sol >= tY) return sol;
    }
    return Math.min(tX, tY) + 1;
  }
  if (hasX) return tX + 1;
  if (hasY) return tY + 1;
  return INF;
}

/** Preenche uma região (em coordenadas de pixel, já com padding) via Fast Marching
 * Method — a frente avança da borda do buraco pra dentro; cada pixel novo é uma média
 * dos vizinhos já preenchidos ponderada por distância, "nível" da frente (pixels que
 * chegaram no mesmo instante pesam mais) e direção (favorece vizinhos que estão "à
 * frente" do gradiente de avanço, o que preserva bordas/linhas que atravessam o buraco
 * em vez de borrar tudo igual). */
function inpaintBox(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  radius = 5
) {
  const w = x1 - x0;
  const h = y1 - y0;
  if (w <= 0 || h <= 0) return;

  const margin = Math.max(radius * 3, Math.round(Math.min(w, h) * 0.6));
  const sx0 = Math.max(0, x0 - margin);
  const sy0 = Math.max(0, y0 - margin);
  const sx1 = Math.min(canvas.width, x1 + margin);
  const sy1 = Math.min(canvas.height, y1 + margin);
  const sw = sx1 - sx0;
  const sh = sy1 - sy0;
  if (sw <= 0 || sh <= 0) return;

  const imageData = ctx.getImageData(sx0, sy0, sw, sh);
  const data = imageData.data;
  const n = sw * sh;
  const idx = (lx: number, ly: number) => ly * sw + lx;

  const holeX0 = x0 - sx0;
  const holeY0 = y0 - sy0;
  const holeX1 = x1 - sx0;
  const holeY1 = y1 - sy0;
  const isHole = (lx: number, ly: number) => lx >= holeX0 && lx < holeX1 && ly >= holeY0 && ly < holeY1;

  const flags = new Uint8Array(n);
  const T = new Float32Array(n).fill(INF);
  const heap = new MinHeap();

  for (let ly = 0; ly < sh; ly++) {
    for (let lx = 0; lx < sw; lx++) {
      const i = idx(lx, ly);
      if (!isHole(lx, ly)) {
        flags[i] = KNOWN;
        T[i] = 0;
        continue;
      }
      // Buraco na borda (tem pelo menos um vizinho fora do buraco) começa na frente.
      const onBorder =
        (lx > 0 && !isHole(lx - 1, ly)) ||
        (lx < sw - 1 && !isHole(lx + 1, ly)) ||
        (ly > 0 && !isHole(lx, ly - 1)) ||
        (ly < sh - 1 && !isHole(lx, ly + 1));
      if (onBorder) {
        flags[i] = BAND;
        T[i] = 0;
        heap.push(0, lx, ly);
      } else {
        flags[i] = INSIDE;
      }
    }
  }

  const neighborT = (lx: number, ly: number): { hasX: boolean; tX: number; hasY: boolean; tY: number } => {
    let hasX = false;
    let tX = INF;
    if (lx > 0 && flags[idx(lx - 1, ly)] !== INSIDE) {
      hasX = true;
      tX = T[idx(lx - 1, ly)]!;
    }
    if (lx < sw - 1 && flags[idx(lx + 1, ly)] !== INSIDE) {
      const t = T[idx(lx + 1, ly)]!;
      if (!hasX || t < tX) {
        hasX = true;
        tX = t;
      }
    }
    let hasY = false;
    let tY = INF;
    if (ly > 0 && flags[idx(lx, ly - 1)] !== INSIDE) {
      hasY = true;
      tY = T[idx(lx, ly - 1)]!;
    }
    if (ly < sh - 1 && flags[idx(lx, ly + 1)] !== INSIDE) {
      const t = T[idx(lx, ly + 1)]!;
      if (!hasY || t < tY) {
        hasY = true;
        tY = t;
      }
    }
    return { hasX, tX, hasY, tY };
  };

  const gradT = (lx: number, ly: number): { gx: number; gy: number } => {
    let gx: number;
    const iC = idx(lx, ly);
    const leftOk = lx > 0 && flags[idx(lx - 1, ly)] !== INSIDE;
    const rightOk = lx < sw - 1 && flags[idx(lx + 1, ly)] !== INSIDE;
    if (leftOk && rightOk) gx = (T[idx(lx + 1, ly)]! - T[idx(lx - 1, ly)]!) / 2;
    else if (rightOk) gx = T[idx(lx + 1, ly)]! - T[iC]!;
    else if (leftOk) gx = T[iC]! - T[idx(lx - 1, ly)]!;
    else gx = 0;

    let gy: number;
    const upOk = ly > 0 && flags[idx(lx, ly - 1)] !== INSIDE;
    const downOk = ly < sh - 1 && flags[idx(lx, ly + 1)] !== INSIDE;
    if (upOk && downOk) gy = (T[idx(lx, ly + 1)]! - T[idx(lx, ly - 1)]!) / 2;
    else if (downOk) gy = T[idx(lx, ly + 1)]! - T[iC]!;
    else if (upOk) gy = T[iC]! - T[idx(lx, ly - 1)]!;
    else gy = 0;

    return { gx, gy };
  };

  const inpaintPixel = (lx: number, ly: number) => {
    const { gx, gy } = gradT(lx, ly);
    const tHere = T[idx(lx, ly)]!;
    let wSum = 0;
    let r = 0;
    let g = 0;
    let b = 0;
    let a = 0;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = lx + dx;
        const ny = ly + dy;
        if (nx < 0 || ny < 0 || nx >= sw || ny >= sh) continue;
        const ni = idx(nx, ny);
        if (flags[ni] === INSIDE) continue;

        const dst2 = dx * dx + dy * dy;
        if (dst2 > radius * radius) continue;
        const dstFactor = 1 / (1 + Math.sqrt(dst2));

        const dirFactor = Math.abs(dx * gx + dy * gy) / Math.sqrt(dst2) || 0.01;

        const levFactor = 1 / (1 + Math.abs(T[ni]! - tHere));

        const weight = dstFactor * (dirFactor + 0.01) * levFactor;
        if (weight <= 0) continue;

        const pi = ni * 4;
        r += weight * data[pi]!;
        g += weight * data[pi + 1]!;
        b += weight * data[pi + 2]!;
        a += weight * data[pi + 3]!;
        wSum += weight;
      }
    }

    if (wSum <= 0) return;
    const pi = idx(lx, ly) * 4;
    data[pi] = Math.round(r / wSum);
    data[pi + 1] = Math.round(g / wSum);
    data[pi + 2] = Math.round(b / wSum);
    data[pi + 3] = Math.round(a / wSum);
  };

  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1]
  ];

  while (heap.size > 0) {
    const cur = heap.pop()!;
    const ci = idx(cur.x, cur.y);
    if (flags[ci] === KNOWN) continue; // entrada obsoleta (T já melhorou desde que foi empilhada)
    flags[ci] = KNOWN;

    for (const [dx, dy] of dirs) {
      const nx = cur.x + dx!;
      const ny = cur.y + dy!;
      if (nx < 0 || ny < 0 || nx >= sw || ny >= sh) continue;
      const ni = idx(nx, ny);
      if (flags[ni] === KNOWN) continue;

      const { hasX, tX, hasY, tY } = neighborT(nx, ny);
      const newT = solveEikonal(tX, hasX, tY, hasY);

      if (flags[ni] === INSIDE) {
        flags[ni] = BAND;
        T[ni] = newT;
        inpaintPixel(nx, ny);
        heap.push(newT, nx, ny);
      } else if (newT < T[ni]!) {
        T[ni] = newT;
        heap.push(newT, nx, ny);
      }
    }
  }

  ctx.putImageData(imageData, sx0, sy0);
}

/** Remove as regiões marcadas (`enabled`) direto no canvas passado — o canvas já deve
 * ter a imagem desenhada nele. Roda uma região de cada vez (evita que os `margin` de
 * duas regiões próximas se sobreponham de forma inconsistente). */
export function removeTextRegions(canvas: HTMLCanvasElement, regions: TextRegion[]) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const pad = 4;
  for (const r of regions) {
    if (!r.enabled) continue;
    const x0 = Math.max(0, Math.round(((r.xPct - r.wPct / 2) / 100) * canvas.width) - pad);
    const y0 = Math.max(0, Math.round(((r.yPct - r.hPct / 2) / 100) * canvas.height) - pad);
    const x1 = Math.min(canvas.width, Math.round(((r.xPct + r.wPct / 2) / 100) * canvas.width) + pad);
    const y1 = Math.min(canvas.height, Math.round(((r.yPct + r.hPct / 2) / 100) * canvas.height) + pad);
    inpaintBox(ctx, canvas, x0, y0, x1, y1);
  }
}
