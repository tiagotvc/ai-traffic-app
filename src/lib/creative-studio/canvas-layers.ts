"use client";

/**
 * Motor de camadas compartilhado do editor de imagem/vídeo (texto, imagem/logo,
 * emoji) — tipos, desenho no canvas e avaliação de animação por tempo. Usado tanto
 * pelo editor de imagem estática (`ImageEditorModal`) quanto pelo editor de slide de
 * vídeo (`SlideLayerEditorModal`) e pelo pipeline de export (`video-export.ts`), pra
 * não duplicar a lógica de desenho entre os três.
 */

export type TextAlign = "left" | "center" | "right";
export type MoveInDirection = "top" | "bottom" | "left" | "right";

export type LayerAnimation = {
  fadeIn: boolean;
  /** Também governa a duração do "entrar deslizando" quando moveIn está ligado. */
  fadeInMs: number;
  fadeOut: boolean;
  fadeOutMs: number;
  moveIn: boolean;
  moveInDirection: MoveInDirection;
  /** Distância percorrida em % do canvas. */
  moveInDistancePct: number;
};

export function defaultAnimation(): LayerAnimation {
  return {
    fadeIn: false,
    fadeInMs: 500,
    fadeOut: false,
    fadeOutMs: 500,
    moveIn: false,
    moveInDirection: "bottom",
    moveInDistancePct: 15
  };
}

export type BaseLayer = {
  id: string;
  /** Posição em % do canvas (0-100) — independe da resolução real da imagem. */
  xPct: number;
  yPct: number;
  /** Graus, -180 a 180. */
  rotation: number;
  /** 0-100. */
  opacity: number;
  animation: LayerAnimation;
};

export type TextLayer = BaseLayer & {
  kind: "text";
  text: string;
  fontFamily: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  letterSpacing: number;
  align: TextAlign;
  color: string;
  strokeEnabled: boolean;
  strokeColor: string;
  strokeWidth: number;
  shadowEnabled: boolean;
  bgEnabled: boolean;
  bgColor: string;
  bgOpacity: number;
  bgStrokeEnabled: boolean;
  bgStrokeColor: string;
  bgStrokeWidth: number;
};

export type ImageLayer = BaseLayer & {
  kind: "image";
  img: HTMLImageElement;
  /** Largura em % da largura do canvas — altura deriva da proporção real da imagem. */
  widthPct: number;
};

export type Layer = TextLayer | ImageLayer;

export const COLOR_SWATCHES = ["#ffffff", "#000000", "#f5a623", "#7c3aed", "#059669", "#dc2626"];

/** Curadoria dos emojis que mais aparecem em criativo de anúncio — chamada de atenção,
 * promoção, prova social. Cada clique cria uma camada de texto (emoji renderiza como
 * texto no canvas), então herda toda a edição de camada de texto (tamanho, rotação etc). */
export const EMOJI_PRESETS = [
  "🔥",
  "✅",
  "⭐",
  "🎉",
  "💥",
  "📢",
  "🚀",
  "💰",
  "🎁",
  "❤️",
  "👍",
  "⚡",
  "🏆",
  "📌",
  "✨",
  "😍",
  "⏰",
  "📍",
  "💯",
  "🆕"
];

/** Curadoria de fontes pra criativo de anúncio — cobre os estilos que mais aparecem
 * (impacto/cartaz, elegante, manuscrita, arredondada) sem virar uma lista infinita. */
export const FONT_OPTIONS: Array<{ label: string; family: string; googleParam: string }> = [
  { label: "Grotesk", family: "'Space Grotesk', sans-serif", googleParam: "Space+Grotesk:wght@500;700" },
  { label: "Impacto", family: "'Anton', sans-serif", googleParam: "Anton" },
  { label: "Cartaz", family: "'Bebas Neue', sans-serif", googleParam: "Bebas+Neue" },
  { label: "Arredondada", family: "'Poppins', sans-serif", googleParam: "Poppins:wght@500;700" },
  { label: "Elegante", family: "'Playfair Display', serif", googleParam: "Playfair+Display:wght@700" },
  { label: "Manuscrita", family: "'Caveat', cursive", googleParam: "Caveat:wght@700" },
  { label: "Condensada", family: "'Oswald', sans-serif", googleParam: "Oswald:wght@600" },
  { label: "Limpa", family: "'DM Sans', sans-serif", googleParam: "DM+Sans:wght@500;700" }
];

let fontsLinkInjected = false;
/** Injeta o `<link>` do Google Fonts uma vez só (compartilhado entre instâncias do
 * editor) — as fontes só existem no canvas depois de carregadas, por isso o redraw
 * depois de `document.fonts.ready`. */
export function ensureFontsLoaded(): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();
  if (!fontsLinkInjected) {
    fontsLinkInjected = true;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?${FONT_OPTIONS.map((f) => `family=${f.googleParam}`).join("&")}&display=swap`;
    document.head.appendChild(link);
  }
  return document.fonts.ready.then(() => undefined);
}

export function newId(): string {
  return Math.random().toString(36).slice(2);
}

export function newTextLayer(text: string): TextLayer {
  return {
    id: newId(),
    kind: "text",
    text,
    fontFamily: FONT_OPTIONS[0]!.family,
    xPct: 50,
    yPct: 80,
    rotation: 0,
    opacity: 100,
    animation: defaultAnimation(),
    fontSize: 42,
    bold: true,
    italic: false,
    underline: false,
    strikethrough: false,
    letterSpacing: 0,
    align: "center",
    color: "#ffffff",
    strokeEnabled: false,
    strokeColor: "#000000",
    strokeWidth: 7,
    shadowEnabled: true,
    bgEnabled: false,
    bgColor: "#000000",
    bgOpacity: 100,
    bgStrokeEnabled: false,
    bgStrokeColor: "#ffffff",
    bgStrokeWidth: 4
  };
}

export function newImageLayer(img: HTMLImageElement): ImageLayer {
  return {
    id: newId(),
    kind: "image",
    img,
    xPct: 50,
    yPct: 50,
    rotation: 0,
    opacity: 100,
    animation: defaultAnimation(),
    widthPct: 22
  };
}

export function textFont(layer: TextLayer, fontSize: number): string {
  return `${layer.italic ? "italic " : ""}${layer.bold ? 700 : 400} ${fontSize}px ${layer.fontFamily}`;
}

export function hexToRgba(hex: string, opacityPct: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(100, opacityPct)) / 100})`;
}

export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const candidate = current ? `${current} ${w}` : w;
    if (current && ctx.measureText(candidate).width > maxWidth) {
      lines.push(current);
      current = w;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function loadImageFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Falha ao carregar imagem"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Falha ao ler arquivo"));
    reader.readAsDataURL(file);
  });
}

export type LayerBounds = {
  x: number;
  y: number;
  w: number;
  h: number;
  lines?: string[];
  fontSize?: number;
  lineHeight?: number;
};

/** Calcula a posição/tamanho (em px do canvas) de uma camada — usado tanto pra
 * desenhar quanto pra hit-test de clique/arraste. Aceita override de xPct/yPct pra
 * permitir avaliar a camada numa posição animada sem mutar o objeto original. */
export function layerBounds(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  layer: Layer,
  overrideXPct?: number,
  overrideYPct?: number
): LayerBounds {
  const xPct = overrideXPct ?? layer.xPct;
  const yPct = overrideYPct ?? layer.yPct;
  const x = (xPct / 100) * canvas.width;
  const y = (yPct / 100) * canvas.height;
  if (layer.kind === "image") {
    const w = (layer.widthPct / 100) * canvas.width;
    const h = w * (layer.img.naturalHeight / layer.img.naturalWidth);
    return { x, y, w, h };
  }
  const fontSize = Math.round((layer.fontSize / 100) * canvas.width * 0.12);
  ctx.font = textFont(layer, fontSize);
  try {
    ctx.letterSpacing = `${layer.letterSpacing}px`;
  } catch {
    /* navegador sem suporte — mede sem espaçamento extra */
  }
  const lines = wrapText(ctx, layer.text, canvas.width * 0.86);
  const lineHeight = fontSize * 1.25;
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width), 20);
  const h = lines.length * lineHeight;
  try {
    ctx.letterSpacing = "0px";
  } catch {
    /* ignore */
  }
  return { x, y, w, h, lines, fontSize, lineHeight };
}

/** Avalia a opacidade e a posição efetivas de uma camada num instante da animação
 * (fade in/out, entrada deslizante). `elapsedMs`/`durationMs` são relativos ao slide
 * em que a camada está (não ao vídeo inteiro). Sem animação configurada, devolve a
 * própria posição/opacidade da camada — comportamento idêntico a antes desse sistema
 * existir. */
export function evaluateLayerAtTime(
  layer: Layer,
  elapsedMs: number,
  durationMs: number
): { xPct: number; yPct: number; opacity: number } {
  const anim = layer.animation;
  let opacityMul = 1;
  if (anim.fadeIn && anim.fadeInMs > 0) {
    opacityMul = Math.min(opacityMul, Math.max(0, Math.min(1, elapsedMs / anim.fadeInMs)));
  }
  if (anim.fadeOut && anim.fadeOutMs > 0) {
    const remaining = durationMs - elapsedMs;
    opacityMul = Math.min(opacityMul, Math.max(0, Math.min(1, remaining / anim.fadeOutMs)));
  }

  let xPct = layer.xPct;
  let yPct = layer.yPct;
  if (anim.moveIn && anim.fadeInMs > 0 && elapsedMs < anim.fadeInMs) {
    const progress = Math.max(0, Math.min(1, elapsedMs / anim.fadeInMs));
    const d = anim.moveInDistancePct * (1 - progress);
    if (anim.moveInDirection === "top") yPct -= d;
    if (anim.moveInDirection === "bottom") yPct += d;
    if (anim.moveInDirection === "left") xPct -= d;
    if (anim.moveInDirection === "right") xPct += d;
  }

  return { xPct, yPct, opacity: layer.opacity * opacityMul };
}

/** Desenha uma camada (texto ou imagem) no canvas, incluindo os efeitos de contorno,
 * sombra, caixa de fundo e sublinhado/tachado. Aceita overrides de posição/opacidade
 * pra desenhar um frame animado sem mutar a camada original, e um retângulo tracejado
 * de seleção opcional. Devolve os bounds calculados (útil pro hit-test/alça de remover
 * reaproveitarem o mesmo cálculo). */
export function drawLayer(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  layer: Layer,
  opts?: { xPct?: number; yPct?: number; opacity?: number; selected?: boolean }
): LayerBounds {
  const bounds = layerBounds(canvas, ctx, layer, opts?.xPct, opts?.yPct);
  const effOpacity = opts?.opacity ?? layer.opacity;

  ctx.save();
  ctx.translate(bounds.x, bounds.y);
  ctx.rotate((layer.rotation * Math.PI) / 180);
  ctx.globalAlpha = Math.max(0, Math.min(100, effOpacity)) / 100;

  if (layer.kind === "image") {
    ctx.drawImage(layer.img, -bounds.w / 2, -bounds.h / 2, bounds.w, bounds.h);
  } else {
    const { lines, fontSize, lineHeight } = bounds as Required<Pick<LayerBounds, "lines" | "fontSize" | "lineHeight">>;

    if (layer.bgEnabled) {
      const padX = fontSize * 0.35;
      const padY = fontSize * 0.25;
      ctx.shadowBlur = 0;
      const r = Math.min(10, fontSize * 0.15);
      ctx.beginPath();
      ctx.roundRect(-bounds.w / 2 - padX, -bounds.h / 2 - padY, bounds.w + padX * 2, bounds.h + padY * 2, r);
      ctx.fillStyle = hexToRgba(layer.bgColor, layer.bgOpacity);
      ctx.fill();
      if (layer.bgStrokeEnabled) {
        ctx.lineWidth = Math.max(1, fontSize * (layer.bgStrokeWidth / 100));
        ctx.strokeStyle = layer.bgStrokeColor;
        ctx.stroke();
      }
    }

    ctx.font = textFont(layer, fontSize);
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    try {
      ctx.letterSpacing = `${layer.letterSpacing}px`;
    } catch {
      /* navegador sem suporte — segue sem espaçamento extra */
    }
    if (layer.shadowEnabled) {
      ctx.shadowColor = "rgba(0,0,0,0.55)";
      ctx.shadowBlur = 10;
    } else {
      ctx.shadowBlur = 0;
    }

    const startY = -((lines.length - 1) * lineHeight) / 2;
    const decorThickness = Math.max(2, fontSize * 0.06);
    lines.forEach((line, i) => {
      const ly = startY + i * lineHeight;
      const lineWidth = ctx.measureText(line).width;
      const lx = layer.align === "left" ? -bounds.w / 2 : layer.align === "right" ? bounds.w / 2 - lineWidth : -lineWidth / 2;

      if (layer.strokeEnabled) {
        ctx.lineWidth = Math.max(2, fontSize * (layer.strokeWidth / 100));
        ctx.strokeStyle = layer.strokeColor;
        ctx.strokeText(line, lx, ly);
      }
      ctx.fillStyle = layer.color;
      ctx.fillText(line, lx, ly);

      if (layer.underline || layer.strikethrough) {
        const prevShadow = ctx.shadowBlur;
        ctx.shadowBlur = 0;
        ctx.fillStyle = layer.color;
        if (layer.underline) ctx.fillRect(lx, ly + fontSize * 0.32, lineWidth, decorThickness);
        if (layer.strikethrough) ctx.fillRect(lx, ly - fontSize * 0.03, lineWidth, decorThickness);
        ctx.shadowBlur = prevShadow;
      }
    });
    try {
      ctx.letterSpacing = "0px";
    } catch {
      /* ignore */
    }
  }

  if (opts?.selected) {
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#7c3aed";
    ctx.lineWidth = Math.max(2, canvas.width * 0.003);
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(-bounds.w / 2 - 12, -bounds.h / 2 - 10, bounds.w + 24, bounds.h + 20);
    ctx.setLineDash([]);
  }
  ctx.restore();
  return bounds;
}
