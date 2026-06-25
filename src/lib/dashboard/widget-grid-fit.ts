/** Grid row height used by the dashboard canvas (must match DashboardGrid). */
export const DASHBOARD_GRID_ROW_HEIGHT = 48;

/** Stored layout uses 12 columns; edit mode quadruples to square cells (4× finer). */
export const HIGHLIGHTS_STORED_GRID_COLS = 12;
export const HIGHLIGHTS_EDIT_GRID_COLS = 48;
export const HIGHLIGHTS_EDIT_SCALE =
  HIGHLIGHTS_EDIT_GRID_COLS / HIGHLIGHTS_STORED_GRID_COLS;

export const DASHBOARD_GRID_MARGIN: [number, number] = [8, 8];

/** Row height so each grid cell is square (width / cols). */
export function computeSquareGridRowHeight(
  containerWidth: number,
  cols: number,
  margin: [number, number] = DASHBOARD_GRID_MARGIN
): number {
  if (containerWidth <= 0 || cols <= 0) return DASHBOARD_GRID_ROW_HEIGHT;
  const [mx] = margin;
  return Math.max(20, (containerWidth - mx * (cols + 1)) / cols);
}

/** Content up to ~12% over one row still maps to a single grid row. */
const ROW_FIT_THRESHOLD = 1.12;

export function contentGridRows(
  heightPx: number,
  minRows = 1,
  maxRows?: number,
  rowHeight = DASHBOARD_GRID_ROW_HEIGHT
): number {
  if (heightPx <= 0) return minRows;

  const raw = heightPx / rowHeight;
  let rows = raw <= ROW_FIT_THRESHOLD ? 1 : Math.ceil(raw);
  rows = Math.max(minRows, rows);
  if (maxRows != null) rows = Math.min(maxRows, rows);
  return rows;
}

/** @deprecated use contentGridRows */
export function quickPillsGridRows(contentHeightPx: number): number {
  return contentGridRows(contentHeightPx + 12, 1, 2);
}
