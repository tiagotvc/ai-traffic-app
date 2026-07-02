/**
 * Feriados nacionais brasileiros + feriados bancários (calendário Bacen/Febraban), usados no
 * cálculo de dia útil do Pix Automático (business-days.ts). Escopo conhecido: só feriados
 * NACIONAIS — feriados estaduais/municipais não estão aqui. O calendário exato que a Asaas usa
 * internamente para a regra de 2-10 dias úteis não é público; isso é o melhor esforço com fontes
 * confiáveis (lei + convenção bancária), não uma cópia confirmada do calendário deles. Se divergir
 * em 1 dia perto de um feriado, o motor recorrente (pix-automatic-billing.ts) já tem rede de
 * segurança: tenta de novo no dia seguinte e loga "JANELA PERDIDA" em vez de falhar silenciosamente.
 */

/** Domingo de Páscoa via algoritmo de Gauss/Meeus (anos 1900-2099, válido pro calendário gregoriano). */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function addDaysUtc(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function toKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Feriados fixos + móveis (base Páscoa) de um ano, no calendário bancário (inclui Carnaval e
 * Corpus Christi, que não são feriados federais por lei mas são non-business para o sistema
 * financeiro/Bacen). */
function holidaysForYear(year: number): Set<string> {
  const easter = easterSunday(year);
  const carnavalMonday = addDaysUtc(easter, -48);
  const carnavalTuesday = addDaysUtc(easter, -47);
  const goodFriday = addDaysUtc(easter, -2);
  const corpusChristi = addDaysUtc(easter, 60);

  const dates = [
    new Date(Date.UTC(year, 0, 1)), // Confraternização Universal
    carnavalMonday,
    carnavalTuesday,
    goodFriday,
    new Date(Date.UTC(year, 3, 21)), // Tiradentes
    new Date(Date.UTC(year, 4, 1)), // Dia do Trabalho
    corpusChristi,
    new Date(Date.UTC(year, 8, 7)), // Independência
    new Date(Date.UTC(year, 9, 12)), // Nossa Senhora Aparecida
    new Date(Date.UTC(year, 10, 2)), // Finados
    new Date(Date.UTC(year, 10, 15)), // Proclamação da República
    // Lei 14.759/2023 — feriado nacional a partir de 2024.
    ...(year >= 2024 ? [new Date(Date.UTC(year, 10, 20))] : []),
    new Date(Date.UTC(year, 11, 25)) // Natal
  ];

  return new Set(dates.map(toKey));
}

const holidayCache = new Map<number, Set<string>>();

export function isBrazilNationalHoliday(date: Date): boolean {
  const year = date.getUTCFullYear();
  let set = holidayCache.get(year);
  if (!set) {
    set = holidaysForYear(year);
    holidayCache.set(year, set);
  }
  return set.has(toKey(date));
}
