import type { MetricKey } from "@/lib/dashboard-metrics";
import { METRIC_BY_KEY } from "@/lib/dashboard-metrics";

export type MetricCatalogCategory =
  | "meta_fields"
  | "derived"
  | "results"
  | "custom";

export type MetricCatalogNode = {
  id: string;
  label: string;
  category: MetricCatalogCategory;
  children?: MetricCatalogNode[];
  metricKey?: MetricKey;
  actionType?: string;
  customMetricId?: string;
};

export const META_ACTION_CATALOG: Array<{ actionType: string; label: string }> = [
  { actionType: "lead", label: "Leads" },
  { actionType: "onsite_conversion.lead_grouped", label: "Leads (onsite)" },
  { actionType: "offsite_conversion.fb_pixel_lead", label: "Leads (pixel)" },
  { actionType: "purchase", label: "Compras" },
  { actionType: "offsite_conversion.fb_pixel_purchase", label: "Compras (pixel)" },
  { actionType: "omni_purchase", label: "Compras (omni)" },
  { actionType: "complete_registration", label: "Cadastros" },
  { actionType: "submit_application", label: "Candidaturas" },
  { actionType: "contact", label: "Contatos" },
  { actionType: "subscribe", label: "Inscrições" },
  {
    actionType: "onsite_conversion.messaging_conversation_started_7d",
    label: "Conversas iniciadas"
  }
];

export const DERIVED_METRICS: MetricKey[] = ["cpa", "cpm", "cpmsg", "frequency"];

export const META_FIELD_METRICS: MetricKey[] = [
  "spend",
  "impressions",
  "reach",
  "clicks",
  "ctr",
  "cpc"
];

export const RESULT_METRICS: MetricKey[] = ["conversions", "messages", "roas"];

export function buildMetricCatalogTree(
  customMetrics: Array<{ id: string; name: string }> = [],
  extraActionTypes: string[] = []
): MetricCatalogNode[] {
  const actionSet = new Set<string>();
  for (const a of META_ACTION_CATALOG) actionSet.add(a.actionType);
  for (const a of extraActionTypes) actionSet.add(a);

  const actionChildren: MetricCatalogNode[] = [];
  for (const actionType of actionSet) {
    const known = META_ACTION_CATALOG.find((a) => a.actionType === actionType);
    actionChildren.push({
      id: `action:${actionType}`,
      label: known?.label ?? actionType,
      category: "results",
      actionType
    });
  }
  actionChildren.sort((a, b) => a.label.localeCompare(b.label));

  const customChildren: MetricCatalogNode[] = customMetrics.map((m) => ({
    id: `custom:${m.id}`,
    label: m.name,
    category: "custom",
    customMetricId: m.id
  }));

  return [
    {
      id: "meta_fields",
      label: "Campos Meta",
      category: "meta_fields",
      children: META_FIELD_METRICS.filter((k) => k in METRIC_BY_KEY).map((key) => ({
        id: `metric:${key}`,
        label: key,
        category: "meta_fields",
        metricKey: key
      }))
    },
    {
      id: "derived",
      label: "Métricas derivadas",
      category: "derived",
      children: DERIVED_METRICS.filter((k) => k in METRIC_BY_KEY).map((key) => ({
        id: `metric:${key}`,
        label: key,
        category: "derived",
        metricKey: key
      }))
    },
    {
      id: "results_metrics",
      label: "Resultados",
      category: "results",
      children: RESULT_METRICS.filter((k) => k in METRIC_BY_KEY).map((key) => ({
        id: `metric:${key}`,
        label: key,
        category: "results",
        metricKey: key
      }))
    },
    {
      id: "results_actions",
      label: "Ações Meta",
      category: "results",
      children: actionChildren
    },
    ...(customChildren.length
      ? [
          {
            id: "custom",
            label: "Fórmulas personalizadas",
            category: "custom" as const,
            children: customChildren
          }
        ]
      : [])
  ];
}

export function catalogNodeToColumnRef(node: MetricCatalogNode): import("@/lib/campaign-table-layout").TableColumnRef | null {
  if (node.metricKey) return { kind: "metric", key: node.metricKey };
  if (node.actionType) return { kind: "meta_action", actionType: node.actionType };
  if (node.customMetricId) return { kind: "custom", id: node.customMetricId };
  return null;
}

export function columnRefToCatalogId(col: import("@/lib/campaign-table-layout").TableColumnRef): string {
  switch (col.kind) {
    case "field":
      return `field:${col.id}`;
    case "metric":
      return `metric:${col.key}`;
    case "meta_action":
      return `action:${col.actionType}`;
    case "custom":
      return `custom:${col.id}`;
  }
}

export function flattenCatalog(nodes: MetricCatalogNode[]): MetricCatalogNode[] {
  const out: MetricCatalogNode[] = [];
  for (const n of nodes) {
    if (n.children?.length) out.push(...flattenCatalog(n.children));
    else if (n.metricKey || n.actionType || n.customMetricId) out.push(n);
  }
  return out;
}

export function filterCatalogTree(nodes: MetricCatalogNode[], query: string): MetricCatalogNode[] {
  const q = query.trim().toLowerCase();
  if (!q) return nodes;
  const out: MetricCatalogNode[] = [];
  for (const n of nodes) {
    if (n.children?.length) {
      const kids = filterCatalogTree(n.children, q);
      if (kids.length) out.push({ ...n, children: kids });
    } else if (n.label.toLowerCase().includes(q) || n.id.toLowerCase().includes(q)) {
      out.push(n);
    }
  }
  return out;
}
