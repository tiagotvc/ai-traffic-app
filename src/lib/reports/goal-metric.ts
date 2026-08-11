import { METRIC_BY_KEY, type MetricKey } from "@/lib/dashboard-metrics";

/**
 * Métrica-resultado que o recorte escolhido pelo usuário sinaliza, em ordem de prioridade.
 *
 * Só entram métricas que o relatório sabe tratar como "meta" — as mesmas que
 * `goalMetricFor()` em report-preview-data.ts pode devolver. Custo e volume de topo
 * (gasto, impressões, CPM…) descrevem o esforço, não o resultado, e por isso ficam de fora.
 */
const GOAL_PRIORITY: MetricKey[] = ["messages", "conversions", "clicks"];

/**
 * Deduz a meta a partir das métricas que o usuário escolheu para o relatório.
 *
 * Existe porque o servidor decide a meta pelo preset das campanhas e pelo objetivo do
 * cliente, sem enxergar o recorte da tela. Num relatório de campanha de mensagem cujas
 * campanhas não estejam marcadas como `lead_whatsapp`, isso fazia os KPIs mostrarem
 * mensagens enquanto o bloco de meta mostrava conversões zeradas.
 *
 * Devolve `null` quando o recorte não sinaliza meta nenhuma — aí o servidor decide,
 * que é o comportamento antigo.
 */
export function goalMetricFromSelection(metrics: MetricKey[]): MetricKey | null {
  for (const key of GOAL_PRIORITY) {
    if (metrics.includes(key)) return key;
  }
  return null;
}

/**
 * Lê o parâmetro `goalMetric` da URL. Só aceita chave conhecida — valor inválido vira
 * `null` e o servidor volta a decidir sozinho, em vez de quebrar a geração.
 */
export function parseGoalMetricParam(value: string | null | undefined): MetricKey | null {
  const key = value?.trim();
  if (!key) return null;
  return key in METRIC_BY_KEY ? (key as MetricKey) : null;
}
