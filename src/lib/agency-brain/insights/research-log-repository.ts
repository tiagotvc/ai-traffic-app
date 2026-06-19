import { MOCK_RESEARCH_LOGS } from "@/lib/agency-brain/insights/mock-research-logs";
import {
  buildAiLogDetails,
  buildPatternLogDetails,
  buildScanLogDetails,
  buildSynthLogDetails,
  mergeLogDetails
} from "@/lib/agency-brain/insights/research-log-details";
import type { ResearchLogDetails, ResearchLogEntry } from "@/lib/agency-brain/insights/types";

let runtimeLogs: ResearchLogEntry[] = [];

function sortLogs(entries: ResearchLogEntry[]): ResearchLogEntry[] {
  return [...entries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getResearchLogs(clientId: string): ResearchLogEntry[] {
  const clientLogs = runtimeLogs.filter((l) => l.clientId === clientId);
  if (clientLogs.length > 0) return sortLogs(clientLogs);
  return sortLogs(MOCK_RESEARCH_LOGS);
}

export function appendResearchLogs(
  clientId: string,
  entries: Omit<ResearchLogEntry, "id" | "clientId">[]
): void {
  const stamped = entries.map((entry, index) => ({
    ...entry,
    id: `log-${Date.now()}-${index}`,
    clientId
  }));
  runtimeLogs = [...stamped, ...runtimeLogs];
}

export type RefineRunContext = {
  adsAnalyzed: number;
  patternsCreated: number;
  aiLearningsCreated: number;
  marketInsights: number;
  status: ResearchLogEntry["status"];
  scanJson?: Record<string, unknown>;
  detectJson?: Record<string, unknown>;
  aiJson?: Record<string, unknown>;
  synthJson?: Record<string, unknown>;
};

export function logRefineRun(clientId: string, result: RefineRunContext): void {
  const now = Date.now();
  const scanDetails = result.scanJson ? buildScanLogDetails(result.scanJson) : undefined;
  const patternDetails = result.detectJson ? buildPatternLogDetails(result.detectJson) : undefined;
  const aiDetails = result.aiJson ? buildAiLogDetails(result.aiJson) : undefined;
  const synthDetails = result.synthJson ? buildSynthLogDetails(result.synthJson) : undefined;

  const entries: Omit<ResearchLogEntry, "id" | "clientId">[] = [
    {
      type: "refine",
      title: "Refinar pesquisas",
      detail: "Pipeline completo executado.",
      status: result.status,
      pointsUsed: result.adsAnalyzed > 0 ? 2 : 1,
      adsAnalyzed: result.adsAnalyzed,
      patternsFound: result.patternsCreated,
      learningsCreated: result.aiLearningsCreated,
      marketInsights: result.marketInsights,
      details: mergeLogDetails(scanDetails, patternDetails, aiDetails, synthDetails),
      createdAt: new Date(now).toISOString()
    }
  ];

  if (result.adsAnalyzed > 0) {
    entries.push({
      type: "market_scan",
      title: "Escaneou Biblioteca Meta",
      detail: `${result.adsAnalyzed} anúncio(s) analisado(s) no nicho.`,
      status: "success",
      adsAnalyzed: result.adsAnalyzed,
      details: scanDetails,
      createdAt: new Date(now + 1).toISOString()
    });
  }

  if (result.patternsCreated > 0) {
    entries.push({
      type: "pattern_detect",
      title: "Detectou padrões nas campanhas",
      detail: `${result.patternsCreated} padrão(ões) detectado(s) por regras.`,
      status: "success",
      patternsFound: result.patternsCreated,
      details: patternDetails,
      createdAt: new Date(now + 2).toISOString()
    });
  }

  if (result.aiLearningsCreated > 0) {
    entries.push({
      type: "ai_analysis",
      title: "Análise IA — campanhas Meta Ads",
      detail: `${result.aiLearningsCreated} aprendizado(s) sugerido(s).`,
      status: "success",
      pointsUsed: 1,
      learningsCreated: result.aiLearningsCreated,
      details: aiDetails,
      createdAt: new Date(now + 3).toISOString()
    });
  }

  if (result.adsAnalyzed > 0) {
    entries.push({
      type: "market_synthesis",
      title: "Síntese IA de mercado",
      detail:
        result.marketInsights > 0
          ? `${result.marketInsights} insight(s) de mercado gerado(s).`
          : "Nenhum insight novo de mercado nesta rodada.",
      status: result.marketInsights > 0 ? "success" : "warning",
      pointsUsed: 1,
      marketInsights: result.marketInsights,
      details: synthDetails,
      createdAt: new Date(now + 4).toISOString()
    });
  }

  appendResearchLogs(clientId, entries);
}

export function resetResearchLogs(): void {
  runtimeLogs = [];
}

export function hasLogDetails(details?: ResearchLogDetails): boolean {
  if (!details) return false;
  return Boolean(
    details.searchTerms?.length ||
      details.competitors?.length ||
      details.adSamples?.length ||
      details.topHooks?.length ||
      details.topCtas?.length ||
      details.campaignPatterns?.length ||
      details.aiSuggestions?.length ||
      details.synthesisItems?.length ||
      details.campaignsAnalyzed?.length
  );
}
