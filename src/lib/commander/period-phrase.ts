import {
  lastMonthRange,
  lastQuarterRange,
  lastWeekRange,
  rollingDaysEndingYesterday,
  thisMonthRange,
  thisQuarterRange,
  thisWeekRange,
  todayIso,
  yesterdayRange
} from "@/lib/report-period";

export type CommanderPeriodMatch = {
  since: string;
  until: string;
  label: string;
  /** Presente quando o pedido não tem como ser atendido com dado diário de verdade (ex.:
   * granularidade horária) — instrução extra pro modelo, ou pro chamador decidir buscar
   * ao vivo na Meta em vez do snapshot sincronizado. */
  note?: string;
  /** Pedido explicitamente por HORA — sinaliza pro chamador tentar quebra horária ao vivo. */
  isHourly?: boolean;
};

type PeriodRule = { pattern: RegExp; resolve: () => CommanderPeriodMatch };

/**
 * Casamento de palavras-chave em pt-BR → range de datas real. Sem NLU, sem chamada
 * extra de LLM — se nada casar, `parsePeriodPhrase` devolve `null` e o chamador mantém
 * o comportamento padrão (últimos 7 dias). Ordem importa: regras mais específicas
 * ("mês passado") vêm antes das mais genéricas ("últimos N dias").
 */
const RULES: PeriodRule[] = [
  {
    pattern: /\bhoje\b/i,
    resolve: () => {
      const t = todayIso();
      return { since: t, until: t, label: "hoje" };
    }
  },
  {
    pattern: /\bontem\b/i,
    resolve: () => {
      const r = yesterdayRange();
      return { since: r.since, until: r.until, label: "ontem" };
    }
  },
  {
    pattern: /semana passada|última semana|semana anterior/i,
    resolve: () => {
      const r = lastWeekRange();
      return { since: r.since, until: r.until, label: "semana passada" };
    }
  },
  {
    pattern: /essa semana|esta semana|semana atual/i,
    resolve: () => {
      const r = thisWeekRange();
      return { since: r.since, until: r.until, label: "essa semana" };
    }
  },
  {
    pattern: /mês passado|mes passado|último mês|ultimo mes|mês anterior|mes anterior/i,
    resolve: () => {
      const r = lastMonthRange();
      return { since: r.since, until: r.until, label: "mês passado" };
    }
  },
  {
    pattern: /esse mês|esse mes|este mês|este mes|mês atual|mes atual/i,
    resolve: () => {
      const r = thisMonthRange();
      return { since: r.since, until: r.until, label: "esse mês" };
    }
  },
  {
    pattern: /trimestre passado|último trimestre|ultimo trimestre|trimestre anterior/i,
    resolve: () => {
      const r = lastQuarterRange();
      return { since: r.since, until: r.until, label: "trimestre passado" };
    }
  },
  {
    pattern: /esse trimestre|este trimestre|trimestre atual/i,
    resolve: () => {
      const r = thisQuarterRange();
      return { since: r.since, until: r.until, label: "esse trimestre" };
    }
  }
];

/** Frases comuns em pt-BR que implicam um período — sem match, devolve `null`. */
export function parsePeriodPhrase(question: string): CommanderPeriodMatch | null {
  const text = question.toLowerCase();

  // Sem granularidade horária — os dados são fechados por dia. Mapeia pro dia de hoje (a
  // aproximação real mais próxima) e avisa o modelo pra ser transparente sobre isso.
  const hoursMatch = text.match(/últimas?\s+(\d{1,3})\s+horas?|ultimas?\s+(\d{1,3})\s+horas?/);
  if (hoursMatch) {
    const t = todayIso();
    return {
      since: t,
      until: t,
      label: "hoje",
      isHourly: true,
      note:
        "O usuário pediu por HORAS. Se a seção de memória abaixo tiver quebra por hora (dado ao " +
        "vivo da Meta), use-a. Se não tiver (fetch ao vivo indisponível no momento), o que segue é " +
        "o dia de hoje inteiro (ainda em andamento) — deixe isso claro uma vez, de forma direta e " +
        "natural (não repita 'não tenho esse dado' como desculpa robótica)."
    };
  }

  const daysMatch = text.match(/últimos?\s+(\d{1,3})\s+dias|ultimos?\s+(\d{1,3})\s+dias/);
  if (daysMatch) {
    const n = Number(daysMatch[1] ?? daysMatch[2]);
    if (Number.isFinite(n) && n >= 1 && n <= 365) {
      const r = rollingDaysEndingYesterday(n);
      return { since: r.since, until: r.until, label: `últimos ${n} dias` };
    }
  }

  for (const rule of RULES) {
    if (rule.pattern.test(text)) return rule.resolve();
  }

  return null;
}
