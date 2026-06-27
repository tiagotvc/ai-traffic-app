/** Colunas fixas à esquerda ao rolar métricas (status + nome). Fundos opacos para não vazar conteúdo ao rolar. */
export const STICKY_STATUS_TH =
  "sticky left-0 z-30 w-14 min-w-[3.5rem] bg-[var(--surface-sticky-thead)] px-2 py-2 text-center shadow-[var(--table-sticky-shadow)]";
export const STICKY_STATUS_TD =
  "sticky left-0 z-20 w-14 min-w-[3.5rem] bg-[var(--surface-sticky-cell)] px-2 py-2.5 text-center shadow-[var(--table-sticky-shadow)] group-even:bg-[var(--surface-sticky-cell-alt)] group-hover:bg-[var(--surface-sticky-cell-hover)]";
export const STICKY_NAME_TH =
  "sticky left-14 z-20 min-w-[10rem] bg-[var(--surface-sticky-thead)] px-4 py-2 text-left align-top shadow-[var(--table-sticky-shadow)]";
export const STICKY_NAME_TD =
  "sticky left-14 z-10 min-w-[10rem] bg-[var(--surface-sticky-cell)] px-4 py-2.5 text-left align-top shadow-[var(--table-sticky-shadow)] group-even:bg-[var(--surface-sticky-cell-alt)] group-hover:bg-[var(--surface-sticky-cell-hover)]";
export const STICKY_STATUS_TF =
  "sticky left-0 z-20 w-14 min-w-[3.5rem] bg-[var(--surface-sticky-thead)] px-2 py-2.5 text-center shadow-[var(--table-sticky-shadow)]";
export const STICKY_NAME_TF =
  "sticky left-14 z-10 min-w-[10rem] bg-[var(--surface-sticky-thead)] px-4 py-2.5 text-left align-top font-semibold text-[var(--text-main)] shadow-[var(--table-sticky-shadow)]";

/** Compact sticky columns (~40–48px rows) — use with `ui-campaign-table--compact`. */
export const STICKY_STATUS_TH_COMPACT =
  "sticky left-0 z-30 w-12 min-w-[3rem] bg-[var(--surface-sticky-thead)] px-1.5 py-1.5 text-center shadow-[var(--table-sticky-shadow)]";
export const STICKY_STATUS_TD_COMPACT =
  "sticky left-0 z-20 w-12 min-w-[3rem] bg-[var(--surface-sticky-cell)] px-1.5 py-2 text-center shadow-[var(--table-sticky-shadow)] group-even:bg-[var(--surface-sticky-cell-alt)] group-hover:bg-[var(--surface-sticky-cell-hover)]";
export const STICKY_NAME_TH_COMPACT =
  "sticky left-12 z-20 min-w-[8rem] bg-[var(--surface-sticky-thead)] px-2.5 py-1.5 text-left align-middle shadow-[var(--table-sticky-shadow)]";
export const STICKY_NAME_TD_COMPACT =
  "sticky left-12 z-10 min-w-[8rem] bg-[var(--surface-sticky-cell)] px-2.5 py-2 text-left align-middle shadow-[var(--table-sticky-shadow)] group-even:bg-[var(--surface-sticky-cell-alt)] group-hover:bg-[var(--surface-sticky-cell-hover)]";
export const STICKY_STATUS_TF_COMPACT =
  "sticky left-0 z-20 w-12 min-w-[3rem] bg-[var(--surface-sticky-thead)] px-1.5 py-2 text-center shadow-[var(--table-sticky-shadow)]";
export const STICKY_NAME_TF_COMPACT =
  "sticky left-12 z-10 min-w-[8rem] bg-[var(--surface-sticky-thead)] px-2.5 py-2 text-left align-middle text-xs font-semibold text-[var(--text-main)] shadow-[var(--table-sticky-shadow)]";
