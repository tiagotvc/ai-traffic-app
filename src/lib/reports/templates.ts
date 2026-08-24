import { DEFAULT_REPORT_METRICS } from "@/lib/report-preview-types";
import type { MetricKey } from "@/lib/dashboard-metrics";
import type { ReportTemplateConfig } from "@/components/reports/ReportsTemplatesControl";

export type BuiltinTemplateId =
  | "performance"
  | "executive"
  | "monthly"
  | "alerts"
  | "creatives"
  | "whatsapp"
  | "consolidated";

type BuiltinChartStyle = "area" | "line" | "bar" | "composed";

export type BuiltinReportTemplate = {
  id: BuiltinTemplateId;
  kind: "single" | "consolidated";
  reportType?: "simple" | "complete";
  metrics?: MetricKey[];
  periodPreset?: string;
  chartStyle?: BuiltinChartStyle;
};

// Cada template precisa de um recorte de métricas (e não só um nome/período diferente) —
// senão "Semanal"/"Performance geral"/"Mensal"/"Executivo" viram a mesma prévia com rótulos
// trocados, que foi exatamente o bug relatado ("todos os templates geram o mesmo relatório").
export const BUILTIN_REPORT_TEMPLATES: BuiltinReportTemplate[] = [
  {
    id: "performance",
    kind: "single",
    reportType: "simple",
    // bate com a descrição do template: "Gasto, conversões, CPA, ROAS e alertas do período".
    metrics: ["spend", "conversions", "cpa", "roas"] as MetricKey[],
    periodPreset: "thisWeek",
    chartStyle: "line"
  },
  {
    id: "executive",
    kind: "single",
    reportType: "complete",
    // resumo de diretoria: eficiência (ROAS/CPA) + escala (reach), não o detalhe operacional.
    metrics: ["spend", "conversions", "roas", "reach"] as MetricKey[],
    periodPreset: "last30",
    chartStyle: "bar"
  },
  {
    id: "monthly",
    kind: "single",
    reportType: "complete",
    // "visão completa do mês": recorte mais amplo que os demais, de propósito.
    metrics: ["spend", "impressions", "reach", "clicks", "ctr", "conversions", "cpa", "roas"] as MetricKey[],
    periodPreset: "thisMonth",
    chartStyle: "area"
  },
  {
    id: "alerts",
    kind: "single",
    reportType: "simple",
    // custo/eficiência + frequência (sinal clássico de fadiga de anúncio) — foco em "o que exige atenção".
    metrics: ["spend", "cpa", "ctr", "frequency"] as MetricKey[],
    periodPreset: "last7",
    chartStyle: "bar"
  },
  {
    id: "creatives",
    kind: "single",
    reportType: "simple",
    // métricas de julgamento de criativo (não de conta) — complementa o ranking de
    // criativos que a prévia já embute abaixo do gráfico pra todo relatório single.
    metrics: ["ctr", "cpa", "frequency", "conversions"] as MetricKey[],
    periodPreset: "last30",
    chartStyle: "bar"
  },
  {
    id: "whatsapp",
    kind: "single",
    reportType: "simple",
    // Campanha de mensagem não tem ROAS nem conversão: o resultado é a conversa aberta.
    // Mesmo recorte do preset lead_whatsapp em campaign-presets.ts (messages/cpmsg/ctr/spend),
    // com clicks e cpc para mostrar o custo do topo do funil que gera a conversa.
    metrics: ["messages", "cpmsg", "spend", "ctr", "clicks", "cpc"] as MetricKey[],
    periodPreset: "thisWeek",
    chartStyle: "line"
  },
  { id: "consolidated", kind: "consolidated" }
];

export function builtinToConfig(tpl: BuiltinReportTemplate): ReportTemplateConfig | null {
  if (tpl.kind === "consolidated" || !tpl.reportType) return null;
  return {
    reportType: tpl.reportType,
    metrics: tpl.metrics ?? DEFAULT_REPORT_METRICS,
    periodPreset: tpl.periodPreset ?? null,
    chartStyle: tpl.chartStyle
  };
}
