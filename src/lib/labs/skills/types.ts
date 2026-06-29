/**
 * Contrato de "skill de cientista" — cada cientista (Labs) é um módulo auto-contido:
 * manifesto (id + flag), `canRun` (pré-condições) e `run` (pesquisa → findings).
 * Executado **server-side** pelo app (não é uma skill do agente de código).
 */

export type ScientistSkillFinding = {
  /** ex.: "competitor_pattern" | "hook" | "offer" | "creative_pattern" | "pricing" */
  type: string;
  title: string;
  body: string;
  evidence?: Record<string, unknown>;
};

export type ScientistSkillResult = {
  scientistId: string;
  ran: boolean;
  reason?: string;
  itemsAnalyzed?: number;
  findings: ScientistSkillFinding[];
  sources: string[];
};

export type ScientistSkillInput = {
  niche?: string | null;
  competitors?: { name: string; pageId?: string }[];
  marketCountry?: string | null;
};

export type ScientistSkill = {
  id: string;
  /** Feature flag de plataforma que liga/desliga este cientista. */
  flagId: string;
  canRun: (input: ScientistSkillInput) => boolean;
  run: (input: ScientistSkillInput) => Promise<ScientistSkillResult>;
};
