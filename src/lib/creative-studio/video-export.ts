"use client";

import { drawLayer, evaluateLayerAtTime, type Layer } from "@/lib/creative-studio/canvas-layers";

export type SlideshowFrame = {
  imageBase64: string;
  mimeType: string;
  /** Camadas de texto/imagem sobrepostas nesse slide (título, emoji, logo, badge…),
   * com animação opcional (fade in/out, entrada deslizante) avaliada por
   * `evaluateLayerAtTime` a cada frame gravado. */
  layers?: Layer[];
};

/** Desenha as camadas do slide no instante `elapsedMs` (relativo ao início do slide). */
function drawSlideLayers(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  frame: SlideshowFrame,
  elapsedMs: number,
  slideDurationMs: number
) {
  if (!frame.layers?.length) return;
  for (const layer of frame.layers) {
    const { xPct, yPct, opacity } = evaluateLayerAtTime(layer, elapsedMs, slideDurationMs);
    if (opacity <= 0) continue;
    drawLayer(ctx, canvas, layer, { xPct, yPct, opacity });
  }
}

export type ExportProgress = { phase: "recording" | "converting" | "encoding"; pct: number };

function loadImageEl(base64: string, mimeType: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar imagem"));
    img.src = `data:${mimeType};base64,${base64}`;
  });
}

/** Recorte "cover" (preenche o quadro, corta sobra) com leve zoom-in ao longo do tempo
 * do slide (efeito Ken Burns) — dá vida ao slideshow sem precisar de lib de animação. */
function drawKenBurnsFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  size: number,
  progress: number,
  alpha = 1
) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const imgAspect = iw / ih;
  let sx: number, sy: number, sw: number, sh: number;
  if (imgAspect > 1) {
    sh = ih;
    sw = ih;
    sy = 0;
    sx = (iw - sw) / 2;
  } else {
    sw = iw;
    sh = iw;
    sx = 0;
    sy = (ih - sh) / 2;
  }
  const scale = 1 + progress * 0.08;
  const zsw = sw / scale;
  const zsh = sh / scale;
  const zsx = sx + (sw - zsw) / 2;
  const zsy = sy + (sh - zsh) / 2;
  const prevAlpha = ctx.globalAlpha;
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, zsx, zsy, zsw, zsh, 0, 0, size, size);
  ctx.globalAlpha = prevAlpha;
}

/**
 * Slideshow em vídeo — desenha as imagens num canvas com zoom lento (Ken Burns) e
 * crossfade entre elas, grava com `MediaRecorder` (nativo do navegador, sem lib) e
 * devolve o WebM cru. A conversão pra MP4 (exigido pela Meta) é feita à parte, só quando
 * necessário, via `convertWebmToMp4` — mantém essa função livre de carregar o ffmpeg.wasm
 * (~20-30MB) se o chamador só quiser o WebM (ex: preview rápido).
 */
export async function recordSlideshowWebm(args: {
  frames: SlideshowFrame[];
  secondsPerFrame: number;
  size?: number;
  onProgress?: (p: ExportProgress) => void;
}): Promise<Blob> {
  const size = args.size ?? 1080;
  const images = await Promise.all(args.frames.map((f) => loadImageEl(f.imageBase64, f.mimeType)));

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível neste navegador");

  const fps = 30;
  const stream = (canvas as HTMLCanvasElement & { captureStream: (fps?: number) => MediaStream }).captureStream(fps);
  const mimeCandidates = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  const mimeType = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? "video/webm";
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };

  const crossfadeMs = 500;
  const slideMs = args.secondsPerFrame * 1000;
  const totalMs = images.length * slideMs;

  const recordingDone = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
  });
  recorder.start(200);

  await new Promise<void>((resolve) => {
    const start = performance.now();
    function tick(now: number) {
      const elapsed = now - start;
      if (elapsed >= totalMs) {
        resolve();
        return;
      }
      const idx = Math.min(images.length - 1, Math.floor(elapsed / slideMs));
      const within = elapsed - idx * slideMs;
      const progress = within / slideMs;

      ctx!.clearRect(0, 0, size, size);
      drawKenBurnsFrame(ctx!, images[idx]!, size, progress);
      drawSlideLayers(ctx!, canvas, args.frames[idx]!, within, slideMs);
      if (idx < images.length - 1 && within > slideMs - crossfadeMs) {
        const alpha = (within - (slideMs - crossfadeMs)) / crossfadeMs;
        drawKenBurnsFrame(ctx!, images[idx + 1]!, size, 0, alpha);
      }

      args.onProgress?.({ phase: "recording", pct: Math.round((elapsed / totalMs) * 100) });
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });

  recorder.stop();
  return recordingDone;
}

/** Conversão WebM→MP4 (H.264) 100% no navegador via ffmpeg.wasm — carregado sob demanda
 * (CDN pública, build single-thread, não exige headers COOP/COEP no app inteiro). A Meta
 * não aceita WebM em anúncio, só MP4/MOV — sem isso o vídeo nasce inútil pra campanha real. */
export async function convertWebmToMp4(webmBlob: Blob, onProgress?: (pct: number) => void): Promise<Blob> {
  const { FFmpeg } = await import("@ffmpeg/ffmpeg");
  const { fetchFile, toBlobURL } = await import("@ffmpeg/util");

  const ffmpeg = new FFmpeg();
  ffmpeg.on("progress", ({ progress }) => onProgress?.(Math.min(100, Math.round(progress * 100))));

  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm")
  });

  await ffmpeg.writeFile("input.webm", await fetchFile(webmBlob));
  await ffmpeg.exec([
    "-i",
    "input.webm",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    "output.mp4"
  ]);
  const data = (await ffmpeg.readFile("output.mp4")) as Uint8Array;
  const copy = new Uint8Array(data.length);
  copy.set(data);
  return new Blob([copy], { type: "video/mp4" });
}

/** Gera o MP4 pronto pra Meta a partir das imagens — junta gravação + conversão. */
export async function generateSlideshowMp4(args: {
  frames: SlideshowFrame[];
  secondsPerFrame: number;
  size?: number;
  onProgress?: (p: ExportProgress) => void;
}): Promise<Blob> {
  const webm = await recordSlideshowWebm({
    frames: args.frames,
    secondsPerFrame: args.secondsPerFrame,
    size: args.size,
    onProgress: args.onProgress
  });
  return convertWebmToMp4(webm, (pct) => args.onProgress?.({ phase: "converting", pct }));
}

/** GIF a partir das mesmas imagens (via `gifenc`) — não passa pelo ffmpeg, não serve pra
 * anúncio pago (Meta não aceita GIF como criativo), é pra baixar e postar no orgânico. */
export async function generateSlideshowGif(args: {
  frames: SlideshowFrame[];
  secondsPerFrame: number;
  size?: number;
  onProgress?: (pct: number) => void;
}): Promise<Blob> {
  const { GIFEncoder, quantize, applyPalette } = await import("gifenc");
  const size = args.size ?? 480;
  const images = await Promise.all(args.frames.map((f) => loadImageEl(f.imageBase64, f.mimeType)));

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível neste navegador");

  const gif = GIFEncoder();
  const framesPerSlide = 12;
  const delayMs = Math.round((args.secondsPerFrame * 1000) / framesPerSlide);
  const total = images.length * framesPerSlide;
  let done = 0;
  const slideDurationMs = args.secondsPerFrame * 1000;

  for (let i = 0; i < images.length; i++) {
    for (let f = 0; f < framesPerSlide; f++) {
      ctx.clearRect(0, 0, size, size);
      drawKenBurnsFrame(ctx, images[i]!, size, f / framesPerSlide);
      drawSlideLayers(ctx, canvas, args.frames[i]!, f * delayMs, slideDurationMs);
      const { data } = ctx.getImageData(0, 0, size, size);
      const palette = quantize(data, 128);
      const index = applyPalette(data, palette);
      gif.writeFrame(index, size, size, { palette, delay: delayMs });
      done++;
      args.onProgress?.(Math.round((done / total) * 100));
    }
  }

  gif.finish();
  const bytes = gif.bytes();
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  return new Blob([copy], { type: "image/gif" });
}
