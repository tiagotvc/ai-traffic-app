import { Bell, PauseCircle, PlayCircle, TrendingDown, TrendingUp, Wallet, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/** Métricas suportadas no construtor de regras (subconjunto do que o motor avalia). */
export type Metric =
  | "cpl"
  | "cpa"
  | "ctr"
  | "spend"
  | "conversions"
  | "roas"
  | "clicks"
  | "cpm"
  | "frequency";
export type Op = "gt" | "gte" | "lt";
export type ActionType =
  | "pause_campaign"
  | "alert_only"
  | "adjust_budget_percent"
  | "schedule_toggle"
  | "reactivate_campaign"
  | "notify_email"
  | "scale_gradual"
  /** Regra→Laboratory: não toca a campanha — publica uma hipótese para investigar. */
  | "create_hypothesis"
  /** Regra→Laboratory: cria hipótese + experimento A/B vinculados (só campanha). */
  | "create_experiment"
  | "notify_whatsapp"
  | "notify_slack";

/** Escopo da regra (Nível 4): em que entidade a condição é avaliada e a ação aplicada. */
export type RuleLevel = "campaign" | "adset" | "ad";

export const LEVEL_OPTIONS: Array<{ value: RuleLevel; label: string; description: string }> = [
  { value: "campaign", label: "Campanhas", description: "Avalia e age em campanhas (padrão)." },
  { value: "adset", label: "Conjuntos de anúncio", description: "Avalia e age em cada conjunto." },
  { value: "ad", label: "Anúncios", description: "Avalia e age em cada anúncio individual." }
];

export const LEVEL_LABEL: Record<RuleLevel, string> = {
  campaign: "Campanhas",
  adset: "Conjuntos",
  ad: "Anúncios"
};

/**
 * Ações válidas por escopo: anúncio não tem orçamento (sem ajuste/escala) e reativação
 * automática só é segura no nível campanha (nos demais, reativaria pausas manuais).
 */
export function actionOptionsForLevel(level: RuleLevel | undefined) {
  const l = level ?? "campaign";
  if (l === "campaign") return ACTION_OPTIONS;
  if (l === "adset") {
    return ACTION_OPTIONS.filter(
      (o) => !["reactivate_campaign", "scale_gradual", "create_experiment"].includes(o.value)
    );
  }
  return ACTION_OPTIONS.filter((o) =>
    [
      "pause_campaign",
      "alert_only",
      "notify_email",
      "notify_whatsapp",
      "notify_slack",
      "create_hypothesis"
    ].includes(o.value)
  );
}

/** Uma condição métrica isolada (sem o gate de gasto mínimo, que é global da regra). */
export type Condition = { metric: Metric; op: Op; value: number };

/** Grupo de condições combinadas em E. Grupos entre si são combinados em OU (forma DNF: `(A e B) ou (C)`). */
export type ConditionGroup = Condition[];

/** `metric` = condições de performance (atual); `schedule` = janela de horário. */
export type RuleKind = "metric" | "schedule";

/**
 * Modo de execução das ações destrutivas: `alert` (só avisa, nunca age), `approval` (fila de
 * pendências, aprovação humana), `auto` (executa direto). `alert`/`approval` exigem
 * `PlanLimits.automationTier >= 2` — o form/UI só oferece a escolha quando o tier permite.
 */
export type ExecutionMode = "alert" | "approval" | "auto";

/** Janela de horário (hora local, 0–23) usada pelo gatilho de agenda. */
export type Schedule = { startHour: number; endHour: number };

/** Estado do formulário de uma regra (condição + ação), compartilhado entre modal, stepper e lista. */
export type RuleForm = {
  name: string;
  /** Tipo de gatilho: métrica de performance ou janela de horário. */
  kind: RuleKind;
  /** Grupos de condições (E dentro do grupo, OU entre grupos). Usado quando `kind === "metric"`. */
  groups: ConditionGroup[];
  minSpend: number;
  action: ActionType;
  /** % de ajuste (`adjust_budget_percent`) ou por passo (`scale_gradual`). */
  budgetPercent?: number;
  /** Nº de incrementos, um por dia. Usado quando `action === "scale_gradual"`. */
  steps?: number;
  /** E-mail de destino. Usado quando `action === "notify_email"`. */
  recipientEmail?: string;
  /** Telefone (E.164) para `notify_whatsapp`. */
  recipientPhone?: string;
  /** Incoming webhook para `notify_slack`. */
  slackWebhookUrl?: string;
  /** Modo de execução das ações destrutivas. Default `auto` (comportamento histórico). */
  executionMode: ExecutionMode;
  /** Janela de horário. Usado quando `kind === "schedule"`. */
  schedule: Schedule;
  /** Escopo da regra: `null`/ausente = todos os clientes; senão o id (uuid) do cliente. */
  clientId?: string | null;
  /** Nível de avaliação/ação: campanha (default), conjunto ou anúncio. */
  level?: RuleLevel;
  /** Janela móvel de agregação em dias (1 = só o dia; default 7). */
  windowDays?: number;
  /** Condição precisa valer por N dias seguidos (default 1). */
  consecutiveDays?: number;
};

export type RuleTone = "rose" | "emerald" | "accent" | "violet" | "sky";

/** Categorias de template ("táticas prontas"): agrupam os templates por intenção. */
export type TemplateCategory = "protecao" | "escala" | "fadiga" | "recuperacao" | "horario";

export const TEMPLATE_CATEGORY_LABEL: Record<TemplateCategory, string> = {
  protecao: "Proteção de verba",
  escala: "Escala segura",
  fadiga: "Fadiga criativa",
  recuperacao: "Recuperação",
  horario: "Horário"
};

export type RuleTemplate = {
  /** Id estável usado na navegação (`?template=<id>`). */
  id: string;
  icon: LucideIcon;
  title: string;
  desc: string;
  ifText: string;
  thenText: string;
  tone: RuleTone;
  /** Ainda não implementado — entra desabilitado. */
  soon?: boolean;
  /** Pré-preenchimento do stepper. Ausente quando `soon`. */
  form?: RuleForm;
  /**
   * Template inteligente: os valores do `form` são placeholders recalculados a partir
   * das metas do cliente quando um cliente é selecionado no stepper.
   * `goal_waste` = gasto > 3× CPA alvo (maxCpa/maxCpl) sem nenhuma conversão.
   */
  smart?: "goal_waste";
  /** Tática do template (agrupamento na galeria). */
  category?: TemplateCategory;
};

export const RULE_TONE_STYLES: Record<RuleTone, { bg: string; color: string }> = {
  rose: { bg: "rgba(239,68,68,0.1)", color: "#ef4444" },
  emerald: { bg: "rgba(16,185,129,0.1)", color: "#10b981" },
  accent: { bg: "var(--ui-accent-muted)", color: "var(--ui-accent)" },
  violet: { bg: "rgba(124,58,237,0.1)", color: "#a78bfa" },
  sky: { bg: "rgba(14,165,233,0.1)", color: "#0ea5e9" }
};

/** Janela padrão para templates de métrica, que não usam `schedule` mas precisam satisfazer `RuleForm`. */
const DEFAULT_SCHEDULE: Schedule = { startHour: 8, endHour: 20 };

export const RULE_TEMPLATES: RuleTemplate[] = [
  {
    id: "smart-cut-waste",
    category: "protecao",
    icon: Wallet,
    title: "Cortar gasto sem retorno (meta do cliente)",
    desc: "Template inteligente: usa o CPA alvo do cliente — pausa quando o gasto passa de 3× a meta sem nenhuma conversão.",
    ifText: "Gasto > 3× CPA alvo e conversões < 1",
    thenText: "Pausar campanha (com aprovação)",
    tone: "violet",
    smart: "goal_waste",
    form: {
      name: "Cortar gasto sem retorno (meta)",
      kind: "metric",
      groups: [
        [
          { metric: "spend", op: "gt", value: 150 },
          { metric: "conversions", op: "lt", value: 1 }
        ]
      ],
      minSpend: 0,
      action: "pause_campaign",
      executionMode: "approval",
      schedule: DEFAULT_SCHEDULE
    }
  },
  {
    id: "hypothesis-low-ctr",
    category: "fadiga",
    icon: TrendingDown,
    title: "Investigar CTR baixo (hipótese)",
    desc: "Não pausa nada: quando o CTR desaba com gasto relevante, cria uma hipótese no Laboratory para investigar fadiga de criativo.",
    ifText: "CTR < 1% e gasto > R$ 100",
    thenText: "Criar hipótese (Laboratory)",
    tone: "sky",
    form: {
      name: "Investigar CTR baixo",
      kind: "metric",
      groups: [
        [
          { metric: "ctr", op: "lt", value: 1 },
          { metric: "spend", op: "gt", value: 100 }
        ]
      ],
      minSpend: 0,
      action: "create_hypothesis",
      executionMode: "auto",
      schedule: DEFAULT_SCHEDULE
    }
  },
  {
    id: "creative-fatigue-ads",
    category: "fadiga",
    icon: TrendingDown,
    title: "Fadiga criativa (anúncios)",
    desc: "Frequência alta + CTR caindo em um anúncio específico: cria hipótese de fadiga para renovar o criativo — sem pausar nada sozinho.",
    ifText: "Frequência > 3,5 e CTR < 1% por anúncio",
    thenText: "Criar hipótese (Laboratory)",
    tone: "violet",
    form: {
      name: "Fadiga criativa por anúncio",
      kind: "metric",
      level: "ad",
      groups: [
        [
          { metric: "frequency", op: "gt", value: 3.5 },
          { metric: "ctr", op: "lt", value: 1 }
        ]
      ],
      minSpend: 50,
      action: "create_hypothesis",
      executionMode: "auto",
      schedule: DEFAULT_SCHEDULE
    }
  },
  {
    id: "reduce-weak-budget",
    category: "protecao",
    icon: Wallet,
    title: "Reduzir orçamento de campanhas fracas",
    desc: "ROAS abaixo de 1 com gasto relevante por 3 dias seguidos: reduz o orçamento em 20% (com aprovação) em vez de pausar de vez.",
    ifText: "ROAS < 1 e gasto > R$ 100 por 3 dias seguidos",
    thenText: "Reduzir orçamento em 20%",
    tone: "rose",
    form: {
      name: "Reduzir orçamento de campanhas fracas",
      kind: "metric",
      groups: [
        [
          { metric: "roas", op: "lt", value: 1 },
          { metric: "spend", op: "gt", value: 100 }
        ]
      ],
      minSpend: 0,
      action: "adjust_budget_percent",
      budgetPercent: -20,
      executionMode: "approval",
      consecutiveDays: 3,
      schedule: DEFAULT_SCHEDULE
    }
  },
  {
    id: "pause-high-cpl",
    category: "protecao",
    icon: PauseCircle,
    title: "Pausar campanha com CPL alto",
    desc: "Pausa a campanha quando o custo por lead passa da meta.",
    ifText: "CPL > R$ 50 e gasto > R$ 30",
    thenText: "Pausar campanha",
    tone: "rose",
    form: {
      name: "Pausar campanha com CPL alto",
      kind: "metric",
      groups: [[{ metric: "cpl", op: "gt", value: 50 }]],
      minSpend: 30,
      action: "pause_campaign",
      executionMode: "auto",
      schedule: DEFAULT_SCHEDULE
    }
  },
  {
    id: "cut-spend",
    category: "protecao",
    icon: Wallet,
    title: "Cortar gasto sem retorno",
    desc: "Pausa quando a campanha gasta demais e não entrega.",
    ifText: "Gasto > R$ 100",
    thenText: "Pausar campanha",
    tone: "accent",
    form: {
      name: "Cortar gasto sem retorno",
      kind: "metric",
      groups: [[{ metric: "spend", op: "gt", value: 100 }]],
      minSpend: 50,
      action: "pause_campaign",
      executionMode: "auto",
      schedule: DEFAULT_SCHEDULE
    }
  },
  {
    id: "high-cpl-alert",
    category: "protecao",
    icon: Bell,
    title: "Alerta de CPL alto",
    desc: "Te avisa assim que o custo por lead passa do limite.",
    ifText: "CPL > R$ 40",
    thenText: "Enviar alerta",
    tone: "violet",
    form: {
      name: "Alerta de CPL alto",
      kind: "metric",
      groups: [[{ metric: "cpl", op: "gt", value: 40 }]],
      minSpend: 0,
      action: "alert_only",
      executionMode: "auto",
      schedule: DEFAULT_SCHEDULE
    }
  },
  {
    id: "low-conversions",
    category: "protecao",
    icon: TrendingDown,
    title: "Alerta de poucas conversões",
    desc: "Avisa quando a campanha converte abaixo do esperado.",
    ifText: "Conversões < 3 e gasto > R$ 50",
    thenText: "Enviar alerta",
    tone: "sky",
    form: {
      name: "Alerta de poucas conversões",
      kind: "metric",
      groups: [[{ metric: "conversions", op: "lt", value: 3 }]],
      minSpend: 50,
      action: "alert_only",
      executionMode: "auto",
      schedule: DEFAULT_SCHEDULE
    }
  },
  {
    id: "pause-cpl-and-roas",
    category: "protecao",
    icon: PauseCircle,
    title: "Pausar CPL alto E ROAS baixo",
    desc: "Pausa só quando o lead sai caro e o retorno está ruim ao mesmo tempo.",
    ifText: "CPL > R$ 50 e ROAS < 2",
    thenText: "Pausar campanha",
    tone: "rose",
    form: {
      name: "Pausar CPL alto e ROAS baixo",
      kind: "metric",
      groups: [
        [
          { metric: "cpl", op: "gt", value: 50 },
          { metric: "roas", op: "lt", value: 2 }
        ]
      ],
      minSpend: 50,
      action: "pause_campaign",
      executionMode: "auto",
      schedule: DEFAULT_SCHEDULE
    }
  },
  {
    id: "scale-winners",
    category: "escala",
    icon: TrendingUp,
    title: "Escalar vencedores",
    desc: "Aumenta o orçamento das campanhas com bom ROAS.",
    ifText: "ROAS > 3,0",
    thenText: "+10% de orçamento",
    tone: "emerald",
    form: {
      name: "Escalar vencedores",
      kind: "metric",
      groups: [[{ metric: "roas", op: "gt", value: 3 }]],
      minSpend: 100,
      action: "adjust_budget_percent",
      budgetPercent: 10,
      executionMode: "auto",
      schedule: DEFAULT_SCHEDULE
    }
  },
  {
    id: "scale-gradual-winners",
    category: "escala",
    icon: TrendingUp,
    title: "Escalar vencedores aos poucos",
    desc: "Sobe o orçamento em incrementos menores ao longo de vários dias — mais seguro que subir tudo de uma vez.",
    ifText: "ROAS > 3,0",
    thenText: "+10% por dia, 3 dias",
    tone: "emerald",
    form: {
      name: "Escalar vencedores aos poucos",
      kind: "metric",
      groups: [[{ metric: "roas", op: "gt", value: 3 }]],
      minSpend: 100,
      action: "scale_gradual",
      budgetPercent: 10,
      steps: 3,
      executionMode: "auto",
      schedule: DEFAULT_SCHEDULE
    }
  },
  {
    id: "reactivate-when-profitable",
    category: "recuperacao",
    icon: PlayCircle,
    title: "Reativar campanha lucrativa",
    desc: "Reativa sozinho uma campanha pausada quando o ROAS histórico volta a compensar.",
    ifText: "ROAS > 2,0",
    thenText: "Reativar campanha",
    tone: "emerald",
    form: {
      name: "Reativar campanha lucrativa",
      kind: "metric",
      groups: [[{ metric: "roas", op: "gt", value: 2 }]],
      minSpend: 0,
      action: "reactivate_campaign",
      executionMode: "auto",
      schedule: DEFAULT_SCHEDULE
    }
  },
  {
    id: "off-hours",
    category: "horario",
    icon: Zap,
    title: "Pausar fora do horário",
    desc: "Desliga as campanhas fora do horário comercial e reativa sozinho dentro dele.",
    ifText: "Fora de 08h–20h",
    thenText: "Pausar / Reativar",
    tone: "sky",
    form: {
      name: "Pausar fora do horário",
      kind: "schedule",
      groups: [],
      minSpend: 0,
      action: "schedule_toggle",
      executionMode: "auto",
      schedule: { startHour: 8, endHour: 20 }
    }
  }
];

export function getRuleTemplate(id: string | null | undefined): RuleTemplate | undefined {
  if (!id) return undefined;
  return RULE_TEMPLATES.find((t) => t.id === id);
}

export const EMPTY_RULE_FORM: RuleForm = {
  name: "",
  kind: "metric",
  groups: [[{ metric: "cpl", op: "gt", value: 50 }]],
  minSpend: 30,
  action: "pause_campaign",
  executionMode: "auto",
  schedule: { startHour: 8, endHour: 20 },
  level: "campaign",
  windowDays: 7,
  consecutiveDays: 1
};

export const WINDOW_OPTIONS = [
  { value: "1", label: "Hoje (1 dia)" },
  { value: "3", label: "Últimos 3 dias" },
  { value: "7", label: "Últimos 7 dias" },
  { value: "14", label: "Últimos 14 dias" }
];

export const CONSECUTIVE_OPTIONS = [
  { value: "1", label: "1 dia (imediato)" },
  { value: "2", label: "2 dias seguidos" },
  { value: "3", label: "3 dias seguidos" },
  { value: "5", label: "5 dias seguidos" },
  { value: "7", label: "7 dias seguidos" }
];

export const EXECUTION_MODE_OPTIONS: Array<{ value: ExecutionMode; label: string; description: string }> = [
  {
    value: "auto",
    label: "Automático",
    description: "Executa a ação assim que a condição bate — comportamento padrão."
  },
  {
    value: "approval",
    label: "Pedir aprovação",
    description: "A ação entra numa fila de pendências; só executa quando alguém aprovar."
  },
  {
    value: "alert",
    label: "Só avisar",
    description: "Nunca executa — gera um alerta para você decidir manualmente."
  }
];

export function executionModeLabel(mode?: string): string {
  if (mode === "approval") return "Pedir aprovação";
  if (mode === "alert") return "Só avisar";
  return "Automático";
}

export const METRIC_LABEL: Record<string, string> = {
  cpl: "CPL",
  cpa: "CPA",
  ctr: "CTR",
  spend: "Gasto",
  conversions: "Conversões",
  roas: "ROAS",
  clicks: "Cliques",
  cpm: "CPM",
  frequency: "Frequência"
};

export const OP_LABEL: Record<string, string> = { gt: ">", gte: "≥", lt: "<" };

export const METRIC_OPTIONS = [
  { value: "cpl", label: "CPL" },
  { value: "cpa", label: "CPA" },
  { value: "ctr", label: "CTR" },
  { value: "spend", label: "Gasto" },
  { value: "conversions", label: "Conversões" },
  { value: "roas", label: "ROAS" },
  { value: "clicks", label: "Cliques" },
  { value: "cpm", label: "CPM (R$)" },
  { value: "frequency", label: "Frequência" }
];

export const OP_OPTIONS = [
  { value: "gt", label: ">" },
  { value: "gte", label: "≥" },
  { value: "lt", label: "<" }
];

export const ACTION_OPTIONS = [
  { value: "pause_campaign", label: "Pausar campanha" },
  { value: "alert_only", label: "Enviar alerta" },
  { value: "adjust_budget_percent", label: "Ajustar orçamento (%)" },
  { value: "scale_gradual", label: "Escalar orçamento gradualmente" },
  { value: "reactivate_campaign", label: "Reativar campanha" },
  { value: "notify_email", label: "Notificar por e-mail" },
  { value: "create_hypothesis", label: "Criar hipótese (Laboratory)" },
  { value: "create_experiment", label: "Abrir experimento (Laboratory)" },
  { value: "notify_whatsapp", label: "Notificar por WhatsApp" },
  { value: "notify_slack", label: "Notificar no Slack" }
];

export function actionLabel(type?: string): string {
  if (type === "pause_campaign") return "Pausar campanha";
  if (type === "alert_only") return "Enviar alerta";
  if (type === "adjust_budget_percent") return "Ajustar orçamento %";
  if (type === "schedule_toggle") return "Pausar / reativar automaticamente";
  if (type === "reactivate_campaign") return "Reativar campanha";
  if (type === "notify_email") return "Notificar por e-mail";
  if (type === "scale_gradual") return "Escalar orçamento gradualmente";
  if (type === "scale_gradual_step") return "Escalar orçamento (passo)";
  if (type === "create_hypothesis") return "Criar hipótese (Laboratory)";
  if (type === "create_experiment") return "Abrir experimento (Laboratory)";
  if (type === "notify_whatsapp") return "Notificar por WhatsApp";
  if (type === "notify_slack") return "Notificar no Slack";
  return type ?? "—";
}

/** Uma cláusula isolada (`CPL > 50`). */
function clauseText(one: { metric?: string; op?: string; value?: number }): string {
  const metric = METRIC_LABEL[one.metric ?? ""] ?? (one.metric ?? "—");
  const op = OP_LABEL[one.op ?? ""] ?? one.op ?? "";
  return `${metric} ${op} ${one.value ?? "—"}`;
}

/**
 * Normaliza qualquer forma salva de condição (grupos novos, `match`+`conditions[]` ou o
 * `metric`/`op`/`value` legado no topo) numa lista de grupos — cada grupo é uma lista de
 * cláusulas combinadas em E; os grupos entre si são combinados em OU.
 */
export function normalizeConditionGroups(c: {
  groups?: Array<Array<{ metric?: string; op?: string; value?: number }>>;
  match?: string;
  conditions?: Array<{ metric?: string; op?: string; value?: number }>;
  metric?: string;
  op?: string;
  value?: number;
}): Array<Array<{ metric?: string; op?: string; value?: number }>> {
  if (Array.isArray(c.groups) && c.groups.length) return c.groups;
  if (Array.isArray(c.conditions) && c.conditions.length) {
    return c.match === "any" ? c.conditions.map((cond) => [cond]) : [c.conditions];
  }
  if (c.metric) return [[{ metric: c.metric, op: c.op, value: c.value }]];
  return [];
}

/**
 * Texto da condição. Aceita a forma nova (`groups`), a intermediária (`match` + `conditions[]`)
 * e a legada (campos `metric`/`op`/`value` no topo), para regras já salvas continuarem legíveis.
 * Regras de agenda (`schedule`) têm um texto próprio.
 */
export function conditionText(c: {
  groups?: Array<Array<{ metric?: string; op?: string; value?: number }>>;
  match?: string;
  conditions?: Array<{ metric?: string; op?: string; value?: number }>;
  metric?: string;
  op?: string;
  value?: number;
  minSpend?: number;
  schedule?: { startHour?: number; endHour?: number };
  windowDays?: number;
  consecutiveDays?: number;
}): string {
  if (c.schedule) {
    const start = String(c.schedule.startHour ?? 0).padStart(2, "0");
    const end = String(c.schedule.endHour ?? 0).padStart(2, "0");
    return `Fora de ${start}h–${end}h`;
  }
  const groups = normalizeConditionGroups(c);
  const groupTexts = groups.map((g) => {
    const text = g.map(clauseText).join(" e ");
    return g.length > 1 && groups.length > 1 ? `(${text})` : text;
  });
  const base = groupTexts.length ? groupTexts.join(" ou ") : "—";
  const extra = c.minSpend ? ` · gasto > R$ ${c.minSpend}` : "";
  const windowText =
    c.windowDays && c.windowDays !== 7 ? ` · janela ${c.windowDays}d` : "";
  const consecutiveText =
    c.consecutiveDays && c.consecutiveDays > 1 ? ` · ${c.consecutiveDays} dias seguidos` : "";
  return `${base}${extra}${windowText}${consecutiveText}`;
}

export function formatLastRun(iso?: string | null): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(iso));
  } catch {
    return null;
  }
}

/** Converte o estado do formulário no payload do `POST /api/automation/rules`. */
export function ruleFormToPayload(form: RuleForm) {
  const name = form.name.trim() || "Nova regra";
  const clientId = form.clientId ?? null;

  const executionMode = form.executionMode ?? "auto";

  if (form.kind === "schedule") {
    return {
      name,
      clientId,
      executionMode,
      condition: { schedule: form.schedule },
      action: { type: "schedule_toggle" as const }
    };
  }

  const groups = form.groups.filter((g) => g.length);
  return {
    name,
    clientId,
    executionMode,
    level: form.level ?? "campaign",
    condition: {
      groups: (groups.length ? groups : EMPTY_RULE_FORM.groups).map((g) =>
        g.map((c) => ({
          metric: c.metric,
          op: c.op,
          value: Number(c.value) || 0
        }))
      ),
      minSpend: form.minSpend > 0 ? Number(form.minSpend) : undefined,
      ...(form.windowDays && form.windowDays !== 7 ? { windowDays: form.windowDays } : {}),
      ...(form.consecutiveDays && form.consecutiveDays > 1
        ? { consecutiveDays: form.consecutiveDays }
        : {})
    },
    action: {
      type: form.action,
      ...(form.action === "adjust_budget_percent"
        ? { budgetPercent: form.budgetPercent ?? 10 }
        : {}),
      ...(form.action === "scale_gradual"
        ? { budgetPercent: form.budgetPercent ?? 10, steps: form.steps ?? 3 }
        : {}),
      ...(form.action === "notify_email"
        ? { recipientEmail: form.recipientEmail?.trim() ?? "" }
        : {}),
      ...(form.action === "notify_whatsapp"
        ? { recipientPhone: form.recipientPhone?.trim() ?? "" }
        : {}),
      ...(form.action === "notify_slack"
        ? { slackWebhookUrl: form.slackWebhookUrl?.trim() ?? "" }
        : {})
    }
  };
}
