/**
 * Registro das pipelines de pesquisa. Cada step = um cientista que vira uma seção
 * do dossiê. Cientistas ainda não implementados ficam aqui declarados; o runner os
 * marca como "skipped" até a skill existir (a pipeline já nasce com o desenho final).
 */
export type PipelineStep = {
  scientistId: string;
  label: string;
  icon?: string; // lucide
};

export type PipelineDef = {
  id: string;
  label: string;
  steps: PipelineStep[];
};

export const RESEARCH_PIPELINES: Record<string, PipelineDef> = {
  marketing: {
    id: "marketing",
    label: "Pesquisa de Marketing",
    steps: [
      { scientistId: "competitor", label: "Concorrentes", icon: "FlaskConical" },
      { scientistId: "trend", label: "Tendências", icon: "TrendingUp" },
      { scientistId: "consumer", label: "Consumidor", icon: "Users" }
    ]
  },
  geo: {
    id: "geo",
    label: "Pesquisa Geográfica",
    steps: [{ scientistId: "geo", label: "Geo", icon: "MapPin" }]
  },
  testing: {
    id: "testing",
    label: "Pesquisa de Testes",
    steps: [{ scientistId: "testing", label: "Testes", icon: "Beaker" }]
  }
};

export function getPipeline(id: string): PipelineDef | null {
  return RESEARCH_PIPELINES[id] ?? null;
}
