/** Data local YYYY-MM-DD (evita bug de UTC no toISOString). */
export function localDatePlusDays(days = 0): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateOnly(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
}

/** Vencimento não pode ser anterior à data de criação da fatura. */
export function isDueDateValid(dueDate: string | null | undefined, createdAt: string): boolean {
  if (!dueDate) return false;
  const due = parseDateOnly(dueDate);
  const created = new Date(createdAt);
  created.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due.getTime() >= created.getTime();
}
