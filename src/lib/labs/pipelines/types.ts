import type { ScientistSkillFinding } from "../skills/types";

/**
 * Pipeline de pesquisa: agrupa N cientistas e consolida num DOSSIÊ com seções
 * (uma por cientista) + sugestões finais. É a fundação do "resumo" do Orion Brain
 * em qualquer criação (campanha/persona/zona).
 */
export type ResearchSection = {
  scientistId: string;
  label: string; // "Concorrentes", "Geo", "Tendências", "Testes"
  icon?: string; // nome do ícone lucide (resolvido na UI)
  summary?: string;
  confidence?: number;
  findings: ScientistSkillFinding[];
  sources: string[];
};

export type ResearchSuggestion = {
  title: string;
  body: string;
  priority?: "high" | "medium" | "low";
};

export type ResearchDossier = {
  pipelineId: string;
  label: string;
  sections: ResearchSection[];
  suggestions: ResearchSuggestion[];
  /** Média das confianças das seções (0–100). */
  confidence?: number;
  /** Cientistas que não rodaram (sem dado/flag off) — para transparência. */
  skipped: string[];
};

/** Eventos de progresso em tempo real da pipeline (SSE). */
export type PipelineEvent =
  | { phase: "start" }
  | { phase: "scientist_start"; scientistId: string; label: string; icon?: string }
  | {
      phase: "scientist_done";
      scientistId: string;
      label: string;
      icon?: string;
      ran: boolean;
      findings: number;
    }
  | { phase: "done"; dossier: ResearchDossier };
