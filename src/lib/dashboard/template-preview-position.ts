const VIEWPORT_MARGIN = 16;
const POINTER_GAP = 14;

export type FloatingPoint = { x: number; y: number };

export type FloatingSize = { width: number; height: number };

export function clampFloatingRect(
  left: number,
  top: number,
  size: FloatingSize,
  viewport = { width: window.innerWidth, height: window.innerHeight }
): { left: number; top: number } {
  return {
    left: Math.max(
      VIEWPORT_MARGIN,
      Math.min(left, viewport.width - size.width - VIEWPORT_MARGIN)
    ),
    top: Math.max(
      VIEWPORT_MARGIN,
      Math.min(top, viewport.height - size.height - VIEWPORT_MARGIN)
    )
  };
}

/** Posiciona o popover perto do cursor sem cortar no viewport. */
export function computeTemplatePreviewPosition(
  pointer: FloatingPoint,
  size: FloatingSize,
  viewport = { width: window.innerWidth, height: window.innerHeight }
): { left: number; top: number } {
  const candidates = [
    { left: pointer.x + POINTER_GAP, top: pointer.y - size.height * 0.35 },
    { left: pointer.x - size.width - POINTER_GAP, top: pointer.y - size.height * 0.35 },
    { left: pointer.x - size.width / 2, top: pointer.y + POINTER_GAP },
    { left: pointer.x - size.width / 2, top: pointer.y - size.height - POINTER_GAP },
    { left: pointer.x + POINTER_GAP, top: pointer.y + POINTER_GAP }
  ];

  let best = clampFloatingRect(candidates[0].left, candidates[0].top, size, viewport);
  let bestScore = -Infinity;

  for (const c of candidates) {
    const clamped = clampFloatingRect(c.left, c.top, size, viewport);
    const overflow =
      Math.max(0, VIEWPORT_MARGIN - c.top) +
      Math.max(0, c.top + size.height - viewport.height + VIEWPORT_MARGIN) +
      Math.max(0, VIEWPORT_MARGIN - c.left) +
      Math.max(0, c.left + size.width - viewport.width + VIEWPORT_MARGIN);
    const dist = Math.hypot(clamped.left - pointer.x, clamped.top - pointer.y);
    const score = -overflow * 1000 - dist;
    if (score > bestScore) {
      bestScore = score;
      best = clamped;
    }
  }

  return best;
}

export function maxTemplatePreviewBodyHeight(headerHeight = 52, chromePadding = 16): number {
  if (typeof window === "undefined") return 360;
  return Math.max(
    220,
    window.innerHeight - VIEWPORT_MARGIN * 2 - headerHeight - chromePadding
  );
}

const PREVIEW_ROW_HEIGHT = 48;
const PREVIEW_GAP = 12;
const PREVIEW_INNER_WIDTH = 960;

export function measureTemplatePreviewLayout(
  rowCount: number,
  viewportWidth: number,
  viewportHeight: number,
  compact = false
): { gridHeight: number; scale: number; scaledHeight: number; paddingTop: number; paddingBottom: number } {
  const rows = Math.max(rowCount, 1);
  const gridHeight = rows * PREVIEW_ROW_HEIGHT + Math.max(0, rows - 1) * PREVIEW_GAP;
  const paddingTop = compact ? 4 : 20;
  const paddingBottom = compact ? 4 : 12;
  const availableHeight = Math.max(1, viewportHeight - paddingTop - paddingBottom);
  const scaleByHeight = availableHeight / gridHeight;
  const scaleByWidth = viewportWidth / PREVIEW_INNER_WIDTH;
  const scale = Math.min(scaleByHeight, scaleByWidth);
  return {
    gridHeight,
    scale,
    scaledHeight: gridHeight * scale + paddingTop + paddingBottom,
    paddingTop,
    paddingBottom
  };
}

export const TEMPLATE_PREVIEW_GRID = {
  rowHeight: PREVIEW_ROW_HEIGHT,
  gap: PREVIEW_GAP,
  innerWidth: PREVIEW_INNER_WIDTH
} as const;
