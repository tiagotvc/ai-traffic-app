import type { MetricKey } from "@/lib/dashboard-metrics";

const STORAGE_KEY = "orion-report-kpi-order";

export function loadReportKpiOrder(): MetricKey[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as MetricKey[]) : [];
  } catch {
    return [];
  }
}

export function saveReportKpiOrder(order: MetricKey[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
  } catch {
    /* ignore quota */
  }
}

/** Aplica ordem salva às métricas selecionadas (máx. 6 KPIs no topo). */
export function mergeReportKpiOrder(selected: MetricKey[], savedOrder: MetricKey[]): MetricKey[] {
  const selectedSet = new Set(selected);
  const ordered = savedOrder.filter((k) => selectedSet.has(k));
  const rest = selected.filter((k) => !ordered.includes(k));
  return [...ordered, ...rest].slice(0, 6);
}
