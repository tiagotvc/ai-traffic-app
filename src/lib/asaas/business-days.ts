/**
 * Cálculo de dias úteis para a janela de criação de cobrança do Pix Automático (2-10 dias úteis
 * antes do vencimento, exigido pela Asaas). Considera sábado/domingo + feriados nacionais e
 * bancários do Brasil (ver brazil-holidays.ts) — NÃO cobre feriados estaduais/municipais, e o
 * calendário exato que a Asaas usa internamente não é público. Se a criação da cobrança for
 * rejeitada por estar fora da janela mesmo assim, o job tenta de novo no próximo dia (ver
 * pix-automatic-billing cron) e loga alto — o risco é atraso de 1 dia, não perda da cobrança.
 */

import { isBrazilNationalHoliday } from "./brazil-holidays";

function isNonBusinessDay(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6 || isBrazilNationalHoliday(date);
}

/** Quantos dias úteis (seg-sex, exceto feriados) existem estritamente entre `from` e `to`
 * (exclusive, from < to). */
export function businessDaysBetween(from: Date, to: Date): number {
  if (to <= from) return 0;
  let count = 0;
  const cursor = new Date(from);
  cursor.setUTCDate(cursor.getUTCDate() + 1);
  while (cursor < to) {
    if (!isNonBusinessDay(cursor)) count++;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

/** Hoje está dentro da janela [minDays, maxDays] dias úteis antes de dueDate? */
export function isWithinBusinessDayWindow(
  dueDate: Date,
  today: Date,
  minDays: number,
  maxDays: number
): boolean {
  const businessDaysUntilDue = businessDaysBetween(today, dueDate);
  return businessDaysUntilDue >= minDays && businessDaysUntilDue <= maxDays;
}

/** dueDate já passou da janela (menos de minDays dias úteis restantes) sem termos criado a cobrança? */
export function isPastBusinessDayWindow(dueDate: Date, today: Date, minDays: number): boolean {
  return businessDaysBetween(today, dueDate) < minDays;
}
