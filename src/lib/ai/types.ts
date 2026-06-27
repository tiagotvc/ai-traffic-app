/** Camada de IA: tipos do roteador Gemini + Claude. */

export type AiProvider = "gemini" | "claude";

/** Natureza da tarefa — guia a escolha economia × acertividade. */
export type AiTaskKind =
  | "classification" // rotular / dedupe / tags — alto volume, barato
  | "extraction" // extrair JSON simples
  | "chat" // conversa geral
  | "summary" // resumo
  | "agent_proposal" // propor ações acionáveis (precisa acertar)
  | "reasoning" // raciocínio multi-passo
  | "analysis" // análise de performance/mercado
  | "creative"; // copy / criativo

export type AiComplexity = "low" | "medium" | "high";

export type AiTask = {
  kind: AiTaskKind;
  /** default "medium" */
  complexity?: AiComplexity;
  /** força o tier de acertividade (Claude) mesmo em tarefa simples */
  accuracyCritical?: boolean;
  /** prefere modelo rápido/barato quando a acertividade não é crítica */
  latencySensitive?: boolean;
  /** rótulo para telemetria/logs */
  label?: string;
};

export type AiModelChoice = {
  provider: AiProvider;
  model: string;
  /** por que esse modelo foi escolhido (telemetria + explicabilidade) */
  reason: string;
};

export type AiGenerateMeta = {
  provider: AiProvider;
  model: string;
  reason: string;
  /** preenchido quando houve fallback cross-provider */
  fellBackFrom?: { provider: AiProvider; model: string } | null;
};
